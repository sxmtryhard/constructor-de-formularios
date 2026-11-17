# F0–F14 · MVP del constructor de formularios

- **Estado:** Aprobada — la persona pidió el 2026-11-16 construir el MVP sin ronda de preguntas («hazlo terminar solo»). Las decisiones marcadas **(IA)** las tomó el agente y la persona debe revisarlas y poder defenderlas.
- **Rol(es):** Creador (con sesión), Respondiente (público, sin sesión).
- **Contratos:** `app/shared/schema.ts`, `app/features/auth/schema.ts`, `app/features/forms/schema.ts`, `app/features/responses/schema.ts`.
- **Requisitos:** `docs/enunciado.md` (§N). Diferencias con la plantilla: ADR-0008.

## Objetivo
Un creador inicia sesión, arma un formulario (6 tipos de campo, reglas, condición), lo publica con un enlace y fecha de cierre, cualquiera responde por `/f/[codigo]` y el creador ve la tabla, el resumen y exporta CSV.

## Decisiones (IA)
1. JSON del cable en **snake_case** (regla 6 de AGENTS.md y su prueba). `id_token`, `siguiente_cursor`, `respondido_en`. ADR-0008 #2 sigue abierto.
2. Respuesta con un campo **no definido → 400** (esquema estricto), no se descarta (§11).
3. Roles: `CREADOR` (por defecto, sin claim) y `ADMINISTRADOR` (reservado; nada lo usa aún).
4. Cuentas: registro e ingreso con correo y contraseña desde la página `/login` (Firebase Auth en el navegador).
5. Código público: 10 caracteres `[a-z0-9]` aleatorios del servidor (`crypto`), único por `create()` en `codigos/{codigo}`.
6. Versionado: cada guardado que cambia `campos` cuando `total_respuestas > 0` incrementa `version` y guarda una copia en `formularios/{id}/versiones/{version}`. La versión 1 también se guarda al publicar por primera vez. Cada respuesta guarda su `version`.
7. Formulario sin publicar o código inexistente → `404`. Pasada la fecha `cierra` → `410`. Despublicar → vuelve a `404` (se conserva el código).
8. Límite de frecuencia (IA): contador en memoria por IP, 20 envíos por minuto en `POST /api/f/:codigo/respuestas` y 60 escrituras por minuto por usuario en rutas privadas → `429` con `Retry-After`. Es por instancia (en Vercel se recomienda además el Firewall).
9. Borrar un formulario borra su documento; las respuestas y versiones quedan huérfanas (Firestore no borra subcolecciones). Fuera de alcance limpiarlas.
10. Tabla de respuestas paginada con cursor (20 por página, `limite` máx. 100). El resumen y el CSV usan todas las respuestas (máx. 5000 leídas; si hay más, se avisa).

## Firestore (camelCase, §9.3)
```text
formularios/{id}       autorUid, titulo, descripcion, campos[], version, publicado, codigo|null, cierra|null, totalRespuestas, creadoEn, actualizadoEn
formularios/{id}/versiones/{version}   version, campos[], creadaEn
formularios/{id}/respuestas/{rid}      version, respondidoEn, valores{}, uid|null
codigos/{codigo}       formularioId
```
Dentro de `campos[]` las claves se guardan igual que en el contrato (`visible_si`, `campo_id`).

## API (errores `{ error, detalles? }`)
Runtime Node.js (el predeterminado). **No** se escribe `export const runtime = "nodejs"`: con `cacheComponents` Next 16 pide quitarlo (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`). Desviación del enunciado §9 anotada en ADR-0008 #9.

| Método y ruta | Auth | Cuerpo / query | Éxito | Errores |
| --- | --- | --- | --- | --- |
| `POST /api/auth/sesion` | — (Origin) | `CreateSessionInput` | `204` + cookie `sesion` HttpOnly, Secure (en producción), SameSite=Lax, Path=/, Max-Age 5 días | 400, 401 (token inválido o inicio no reciente), 403 Origin |
| `DELETE /api/auth/sesion` | — | — | `204`, borra cookie y revoca refresh tokens si había sesión | — |
| `GET /api/auth/yo` | sesión | — | `200 MeResponse` | 401 |
| `GET /api/formularios` | sesión | `PageQuery` | `200 FormList` (los del usuario, más recientes primero) | 400, 401 |
| `POST /api/formularios` | sesión + Origin | `FormInput` | `201 Form` | 400, 401, 403, 429 |
| `GET /api/formularios/:id` | sesión | — | `200 Form` | 401, 404 (ajeno o inexistente) |
| `PUT /api/formularios/:id` | sesión + Origin | `FormInput` | `200 Form` | 400, 401, 403, 404, 429 |
| `DELETE /api/formularios/:id` | sesión + Origin | — | `204` | 401, 403, 404 |
| `POST /api/formularios/:id/publicar` | sesión + Origin | `PublishInput` | `200 Form` (`publicado`, `codigo`) | 400 (`cierra` en el pasado, sin campos), 401, 403, 404 |
| `POST /api/formularios/:id/despublicar` | sesión + Origin | — | `200 Form` | 401, 403, 404 |
| `GET /api/formularios/:id/respuestas` | sesión | `PageQuery` | `200 ResponseList` | 400, 401, 404 |
| `GET /api/formularios/:id/resumen` | sesión | — | `200 FormSummary` | 401, 404 |
| `GET /api/f/:codigo` | público | — | `200 PublicForm`, `Cache-Control: public, s-maxage=30` | 404, 410 |
| `POST /api/f/:codigo/respuestas` | público + Origin | `SubmitInput` | `201 SubmitResult` | 400 (con `detalles` por campo), 404, 410, 413 (> 64 KB), 415, 429 |

Autenticación (§9.1): cookie `sesion` verificada con `verifySessionCookie(cookie, true)`, o `Authorization: Bearer <idToken>` con `verifyIdToken`. Origen: en métodos que modifican, la cabecera `Origin` debe coincidir con el host de la petición → si no, 403.

## Pantallas
| Ruta | Contenido |
| --- | --- |
| `/login` | Ingresar / crear cuenta (correo, contraseña con `autocomplete`) |
| `/formularios` | Mis formularios: lista, crear, enlaces a editar y respuestas; estados carga/vacío/error/reintento |
| `/formularios/[id]/editar` | Constructor: `useReducer`; agregar campo por tipo (botón y arrastrar desde la paleta); ordenar arrastrando o con «Subir/Bajar»; etiqueta, obligatorio, opciones, mín./máx./patrón, «Mostrar si»; vista previa; guardar; publicar con fecha de cierre; copiar enlace |
| `/f/[codigo]` | Formulario público: un componente por tipo; validación con Constraint Validation API + el esquema Zod generado; errores junto al campo con `aria-describedby` y `aria-live`; mensaje de enviado, cerrado (410) o no encontrado |
| `/formularios/[id]/respuestas` | Tabla de respuestas (con versión), resumen por pregunta, «Descargar CSV» (`Blob`) con alternativa «Copiar CSV» |

## Criterios de aceptación
- **Dado** un campo obligatorio vacío **cuando** se envía sin validación del cliente **entonces** 400 con `detalles` para ese campo.
- **Dado** un formulario con `cierra` en el pasado **cuando** se responde **entonces** 410.
- **Dado** que el creador cambia un campo de un formulario con respuestas **cuando** guarda **entonces** `version` sube y las respuestas antiguas conservan su versión y su definición en `versiones`.
- **Dado** una respuesta con un campo no definido **entonces** 400.
- **Dado** un usuario sin sesión **cuando** llama a una ruta privada **entonces** 401; **dado** el formulario de otro usuario **entonces** 404.
- **Dado** un patrón `(a+)+` **cuando** se guarda **entonces** 400.
- **Dado** 31 campos **entonces** 400.
- **Dado** un lector de pantalla **entonces** cada campo tiene `<label>` y su error asociado.

## Fuera de alcance
F15–F18 (OpenAPI, Bruno, despliegue, evidencias de calidad, comparar versiones), modo oscuro, borrar respuestas.
