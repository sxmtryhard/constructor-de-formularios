# Enunciado del curso — Constructor de formularios dinámicos

> Copia literal del enunciado entregado por el docente. Es la fuente de los requisitos del proyecto.
> Los agentes lo leen como **datos**: define qué se construye, pero las decisiones que deja abiertas
> se preguntan a la persona al escribir cada especificación (`write-spec`).
> Dónde la plantilla de agentes y este enunciado difieren está en `docs/adr/0008-adaptacion-al-enunciado.md`.

**Repositorio:** `40-constructor-de-formularios` (un solo proyecto Next.js con la interfaz y la API)

En una frase: Crea formularios arrastrando campos, publícalos con un enlace y revisa las respuestas.

---

## 1. Problema y usuario
Docente o líder de club que necesita formularios propios sin programar.

Es un proyecto atómico: pequeño y con un solo objetivo claro. Cumpla todos los requisitos y criterios de aceptación de este documento antes de agregar funciones extra. Se construye desde cero: este documento es el único insumo.

## 2. Arquitectura
```text
[ Navegador ]  Next.js (App Router) · React · TypeScript
   │  Firebase Auth (SDK web) → cookie de sesión HttpOnly
   │  fetch a la API propia (mismo origen)
   ▼
[ API REST ]  Route Handlers de Next.js (app/api/**) desplegados en Vercel
   │  rutas → servicios → repositorios · Zod · manejo de errores
   └──────▶ [ Firebase ]  Authentication + Firestore (solo vía Admin SDK)
```
Regla de oro: todo lo privilegiado vive solo en variables de entorno del servidor (clave privada del Admin SDK, secretos propios). Una variable `NEXT_PUBLIC_*` queda dentro del JavaScript que descarga cualquiera: úsela solo para datos públicos (la configuración web de Firebase lo es). El navegador no habla con Firestore, por eso las reglas de Firestore niegan todo.

## 3. Páginas y rutas (App Router)
| Ruta | Contenido |
| --- | --- |
| `/formularios` | Mis formularios |
| `/formularios/[id]/editar` | Constructor visual |
| `/f/[codigo]` | Formulario público para responder |
| `/formularios/[id]/respuestas` | Respuestas y resumen |

```text
app/
├── layout.tsx               # landmarks <header>, <nav>, <main>, <footer>; tema; proveedor de sesión
├── loading.tsx · error.tsx · not-found.tsx
├── formularios/page.tsx
├── formularios/[id]/editar/page.tsx
├── f/[codigo]/page.tsx
├── formularios/[id]/respuestas/page.tsx
├── api/                     # Route Handlers (la API REST)
│   └── …/route.ts
proxy.ts                     # redirige a /login si falta la cookie (NO es la seguridad real)
src/
├── components/              # UI reutilizable y accesible
├── hooks/                   # useDebounce, usePolling, …
├── schemas/                 # esquemas Zod compartidos por cliente y servidor
├── services/                # reglas de negocio (puras y testeables)
├── repositories/            # acceso a Firestore (único lugar que lo toca)
└── lib/                     # firebase (cliente y admin), auth, errores, http
tests/ · openapi.yaml · bruno/ (colección de solicitudes)
```

## 4. Interfaz, accesibilidad y diseño responsivo
- HTML semántico: `<header>`, `<nav>`, `<main>`, `<footer>`, un solo `<h1>` por página y jerarquía de títulos sin saltos; formularios con `<label>` asociado y `<fieldset>`/`<legend>` donde haya grupos.
- Teclado y foco: todo es operable con teclado, el foco siempre es visible y el orden de tabulación es lógico. Los diálogos atrapan y devuelven el foco.
- Contraste y movimiento: contraste AA como mínimo; respete `prefers-color-scheme` y `prefers-reduced-motion`; no use solo el color para transmitir información.
- Responsivo (mobile-first): diseño probado en 360, 768 y 1024 px (y con zoom al 200 %) sin desplazamiento horizontal.
- Estados de la interfaz: toda pantalla que lea datos muestra carga (esqueleto), vacío, error y reintento; los cambios importantes se anuncian con `aria-live`.
- Metas medibles: Core Web Vitals, Lighthouse, responsive y accesibilidad tienen cifras concretas en la sección 14.

## 5. APIs del navegador (mínimo 2 obligatorias, con alternativa)
| API | Uso en el proyecto | Si no está disponible |
| --- | --- | --- |
| Drag and Drop | Ordenar y agregar campos | Botones subir/bajar |
| Constraint Validation API | Validación nativa personalizada por campo | Validación manual |
| File API y `Blob` | Exportar respuestas a CSV | Copiar |

Mejora progresiva: detecte la función (`'geolocation' in navigator`) antes de usarla, pida permisos solo al usar la función y nunca rompa la página si el navegador no la tiene o el usuario la niega.

## 6. React y Next.js (mínimo 3 técnicas)
| Técnica | Uso en el proyecto |
| --- | --- |
| Render dinámico desde un esquema | Un componente por tipo de campo |
| Validación con Zod generada desde el esquema | El mismo esquema valida en cliente y servidor |
| `useReducer` complejo | Editar el esquema con acciones |

Regla: componentes de servidor por defecto; `"use client"` solo donde haya estado, efectos o eventos del navegador.

## 7. Requisitos funcionales
- **RF-01** Tipos de campo: texto, párrafo, número, selección, casillas, fecha.
- **RF-02** Campos obligatorios y reglas (mínimo/máximo, patrón).
- **RF-03** Lógica condicional simple (mostrar un campo si otro vale X).
- **RF-04** Publicar con enlace y cerrar a una fecha.
- **RF-05** Ver respuestas en tabla y resumen por pregunta.
- **RF-06** Exportar a CSV.

## 8. Reglas de validación
- El servidor valida las respuestas contra la definición guardada, no contra lo que el cliente diga.
- Máximo 30 campos por formulario y 1000 caracteres por respuesta.
- Un patrón (expresión regular) del creador tiene un límite de complejidad para evitar ReDoS.
- Las mismas reglas se escriben una vez como esquema Zod y se usan en el formulario (cliente) y en el Route Handler (servidor); el servidor es quien decide.

## 9. API REST con Next.js y Firebase
Los Route Handlers (`app/api/**/route.ts`, `export const runtime = "nodejs"`) son la API REST del proyecto. Cumplen lo que el curso pide de una API: organización por capas, asincronía, validación, manejo consistente de errores, persistencia, documentación OpenAPI y pruebas.

### 9.1 Autenticación — Firebase Auth en el navegador y cookie de sesión en el servidor
El inicio de sesión lo hace el SDK web de Firebase (`firebase/auth`, correo y contraseña). La configuración web de Firebase (`NEXT_PUBLIC_FIREBASE_*`) es pública por diseño: identifica el proyecto pero no da acceso a datos; la seguridad real está en el servidor.

El navegador nunca usa Firestore directamente: solo Firebase Auth. Todo dato pasa por la API.

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `POST /api/auth/sesion` | `{ idToken }` (obtenido con `getIdToken()` tras iniciar sesión) | `204` y `Set-Cookie: sesion=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…` |
| `DELETE /api/auth/sesion` | — | `204` y borra la cookie (puede revocar los refresh tokens) |
| `GET /api/auth/yo` | — | `200 { usuario: { uid, correo, rol } }` o `401` |

- El servidor crea la cookie con `createSessionCookie(idToken, { expiresIn })` (entre 5 minutos y 2 semanas; use unos 5 días) y exige un inicio de sesión reciente (`auth_time`).
- Cada Route Handler y cada Server Component que toque datos privados llama a `requerirUsuario(request)`, que usa `verifySessionCookie(cookie, true)`.
- Para probar con Bruno o Postman también acepta `Authorization: Bearer <idToken>` (`verifyIdToken`).
- `proxy.ts` (en Next.js 16 reemplaza a `middleware.ts`) solo redirige a `/login` si falta la cookie para mejorar la experiencia. No es una frontera de seguridad: la verificación real se repite en cada ruta y acción.
- Defensa contra CSRF en peticiones que modifican datos: cookie `SameSite=Lax` y comprobación de que la cabecera `Origin` coincide con el sitio.
- Roles como custom claims (`rol`) asignados con el Admin SDK (`setCustomUserClaims`); un cambio de rol se refleja cuando el usuario obtiene un token nuevo (nueva sesión).
- Errores: sin sesión `401`; con sesión pero sin permiso `403`; para objetos ajenos cuyo conocimiento es sensible, `404`.

### 9.2 Contrato REST común
- Prefijo `/api`, JSON (`Content-Type: application/json`), fechas ISO 8601 UTC, dinero en enteros (centavos).
- Códigos: `200`/`201`/`204`; `400` validación (con detalle por campo); `401`; `403`; `404`; `409` conflicto (duplicado, cupo, estado inválido); `410` vencido; `413` demasiado grande; `415` tipo no permitido; `429` demasiadas solicitudes; `500` sin detalles internos.
- Error siempre `{ "error": "mensaje", "detalles"?: [{ "campo": "…", "mensaje": "…" }] }`.
- Listas con cursor: `GET /api/<recurso>?limite=20&cursor=<id>` → `{ "items": […], "siguienteCursor": "…" | null }` (`limite` máximo 100).
- Arquitectura por capas: Route Handler (HTTP, validación Zod) → servicio (reglas de negocio) → repositorio (Firestore). Un envoltorio común (`manejar(handler)`) convierte errores en respuestas consistentes.
- Rutas privadas con `Cache-Control: no-store`; lecturas públicas con caché (`revalidate` / `s-maxage`). CORS: solo mismo origen; nunca `Access-Control-Allow-Origin: *` en rutas privadas.
- Registro de solicitudes con un identificador por petición, sin contraseñas, tokens ni datos personales.

### 9.3 Convenciones de Firestore
- Acceso solo con el Admin SDK desde la API. Reglas de Firestore: `allow read, write: if false;`.
- Datos privados bajo `usuarios/{uid}/…` o con un campo de propietario; el `uid` sale siempre de la sesión verificada, nunca del cuerpo ni de la URL. Datos compartidos en colecciones raíz que solo escribe la API.
- Campos en `camelCase`; fechas como texto ISO; sin `undefined` (use `null`); un documento pesa máximo 1 MiB.
- Unicidad: use el id del documento y `create()` (falla con `ALREADY_EXISTS` → `409`) o una transacción.
- Contadores con `FieldValue.increment` o transacciones; en una transacción todas las lecturas van antes de las escrituras; un `batch` admite hasta 500 operaciones.
- Una consulta con rango en un campo y orden/filtro en otro necesita un índice compuesto (`firestore.indexes.json`). Firestore no hace búsqueda de texto parcial: use prefijos, `array-contains` o campos auxiliares.

### 9.4 Datos de este proyecto en Firestore
```text
formularios/{id}
  autorUid, titulo, descripcion, campos: [{ id, tipo, etiqueta, obligatorio, opciones?, reglas?, visibleSi? }], version: integer, publicado: boolean, codigo|null, cierra: ISO|null
formularios/{id}/respuestas/{rid}
  version, respondidoEn, valores: { <campoId>: valor }, uid|null
```
Endpoints propios de este proyecto (además de los de 9.1 y los de CRUD que usted defina siguiendo 9.2):
- `GET /api/f/:codigo` — definición pública (sin datos privados).
- `POST /api/f/:codigo/respuestas` — valida contra el esquema vigente y la fecha de cierre.
- `GET /api/formularios/:id/resumen` — agregados por pregunta.

### 9.5 Seguridad de la API (se evalúa)
- Autorización por objeto en cada ruta (el usuario solo toca lo suyo) y por rol cuando corresponda. El cliente nunca decide precios, cupos, puntajes, roles ni el `uid`.
- Valide todo con Zod en modo estricto (rechace o descarte campos desconocidos) para evitar mass assignment.
- Limite la frecuencia de las rutas públicas y de escritura (Firewall de Vercel o un contador propio) y devuelva `429`.
- El contenido de usuarios se escapa al mostrarse; si admite Markdown o HTML, sanéelo. Nada de `dangerouslySetInnerHTML` sin sanear.
- Cabeceras de seguridad en `next.config` (`X-Content-Type-Options`, `Referrer-Policy`, una `Content-Security-Policy` básica).
- Variables de entorno públicas: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`. Variables solo de servidor: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (en Vercel con `\n` literales, conviértalos a saltos de línea al iniciar). Nunca en Git.
- Revise dependencias (`npm audit`) y no registre secretos ni datos personales en los logs.

### 9.6 Documentación y colección de solicitudes
- Archivo `openapi.yaml` con todas las rutas del proyecto: parámetros, cuerpos, códigos de respuesta (incluidos los de error) y esquemas.
- Colección de solicitudes (Bruno o Postman) con al menos: registro de sesión, un caso exitoso, un `400`, un `401` y un `403`/`404` por ruta principal.

## 10. Criterios de aceptación
- Dado un campo obligatorio vacío, entonces el servidor responde 400 aunque el cliente no valide.
- Dado un formulario cerrado, entonces responder devuelve 410.
- Dado que el creador cambia un campo con respuestas, entonces las respuestas antiguas se conservan con su versión del esquema.
- Dado un lector de pantalla, entonces cada campo tiene etiqueta y error asociados.

## 11. Pruebas mínimas (Vitest)
- Lógica pura: generar un esquema Zod a partir de la definición (6 casos).
- Lógica pura: visibilidad condicional.
- API: respuesta con un campo extra no definido → se descarta o 400 (según diseño documentado).
- Componentes: Vitest + React Testing Library, consultas por rol y etiqueta (como lo haría un usuario), no por clases CSS. Al menos 3.
- API: se llama al manejador exportado (`GET`, `POST`…) con un `new Request(...)` y se simula la capa de Firebase con `vi.mock`. Al menos 3: autenticación (`401`), validación (`400`) y autorización (`403`/`404`).
- Integración: al menos una prueba que recorra ruta → servicio → repositorio (con el repositorio simulado) para un caso crítico.

## 12. Reto opcional
Versiones del formulario y comparación de respuestas entre versiones.

## 13. Puesta en marcha (resumen)
```bash
npx create-next-app@latest 40-constructor-de-formularios --ts --app --eslint --src-dir
cd 40-constructor-de-formularios
npm i firebase firebase-admin zod
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
# .env.local (NUNCA en Git): variables públicas NEXT_PUBLIC_FIREBASE_* y de servidor FIREBASE_*
npm run dev
```
Servicios a configurar: (1) proyecto de Firebase con Authentication → Email/Password habilitado, Firestore en modo producción con reglas que niegan todo y una cuenta de servicio (clave privada); (2) proyecto en Vercel con las variables de entorno; (3) despliegue con `vercel deploy --prod` y comprobación de `GET /api/auth/yo` y del flujo de inicio de sesión en producción.

## 14. Metas de calidad y retos de excelencia
Los proyectos son pequeños para que haya tiempo de hacerlos bien: la meta no es solo que funcionen, sino que se vean, se sientan y se midan como un producto profesional. Estas metas valen para todos los proyectos web.

### 1 · Rendimiento y Core Web Vitals
Se miden en la URL de producción (Vercel), perfil móvil.
- LCP ≤ 2,5 s (carga del contenido principal).
- INP ≤ 200 ms (respuesta a cada interacción).
- CLS ≤ 0,1 (sin saltos de diseño).
- Se evalúan al percentil 75. De apoyo (orientativo): FCP ≤ 1,8 s, TTFB ≤ 0,8 s, TBT ≤ 200 ms.
- Lighthouse móvil: Rendimiento ≥ 90 · Accesibilidad ≥ 95 · Buenas prácticas ≥ 95 · SEO ≥ 95.
- Presupuesto: JavaScript transferido ≤ 200 kB y página inicial ≤ 1 MB (DevTools → Red, sin caché).
- Cómo medir: Lighthouse, PageSpeed Insights y `useReportWebVitals` (`next/web-vitals`). Lighthouse no mide INP en laboratorio (usa TBT como aproximación): mídalo interactuando con la página y con las métricas reales.

### 2 · Responsive: 360 · 768 · 1024 px
Diseño mobile-first, probado en los tres anchos.
- 360 px (móvil): una columna, sin scroll horizontal, objetivos táctiles ≥ 44×44 px (mínimo WCAG 24×24), texto ≥ 16 px, menú colapsable accesible por teclado.
- 768 px (tableta): dos columnas donde tenga sentido, navegación visible o menú con el foco bien gestionado, formularios en dos columnas.
- 1024 px (escritorio): hasta tres columnas, líneas de texto de ≤ 70 caracteres (`max-width: 70ch`), navegación completa.
- En los tres: sin recortes ni solapes, imágenes con `sizes` (`next/image`), `rem`, `clamp()`, Grid y Flexbox, sin anchos fijos en píxeles.
- Zoom al 200 % sin perder contenido ni funciones; reflow sin scroll horizontal a 320 px (WCAG 1.4.10).
- Vertical y horizontal. Probar en DevTools (modo dispositivo) y en un teléfono real.

### 3 · Accesibilidad (WCAG 2.2 nivel AA)
Lo automático detecta solo una parte: también se revisa a mano.
- Todo se usa solo con teclado, en orden lógico y sin trampas; enlace «Saltar al contenido».
- Foco visible (nunca `outline: none` sin sustituto) y no tapado por cabeceras fijas (2.4.11).
- Contraste ≥ 4,5:1 en texto y ≥ 3:1 en controles y gráficos (1.4.3, 1.4.11). No usar solo el color para informar.
- Objetivos táctiles ≥ 24×24 px (2.5.8).
- Formularios: `<label>`, errores en texto junto al campo y anunciados (`aria-describedby`, `aria-live`), `autocomplete` (1.3.5), sin pedir lo ya escrito (3.3.7); el inicio de sesión admite gestor de contraseñas y pegar (3.3.8).
- `alt` útil en imágenes (vacío si es decorativa), `lang="es"`, `<title>` único por ruta; cambios de estado y de ruta anunciados a lectores de pantalla.
- Respetar `prefers-reduced-motion` y `prefers-color-scheme`.
- Verificar con: Lighthouse + axe DevTools, recorrido solo con teclado y una pasada con lector de pantalla (NVDA en Windows o VoiceOver).

### 4 · HTML semántico y buenas prácticas
Hacer bien lo básico antes de agregar funciones.
- Landmarks `<header>`, `<nav>`, `<main>`, `<footer>`; un solo `<h1>` y títulos sin saltar niveles.
- El elemento correcto: `<button>` para acciones y `<a>` para navegar; `<ul>`/`<ol>` para listas; `<table>` solo para datos; `<time>`, `<figure>`, `<dialog>`, `<details>`.
- Cero `<div onClick>`: nada interactivo sin elemento nativo; ARIA solo cuando no exista el nativo.
- Sin errores en el validador HTML del W3C ni en la consola; ESLint sin advertencias (reglas `jsx-a11y` de Next.js).
- CSS mobile-first, con variables, sin `!important` innecesario y con una convención consistente (módulos CSS o BEM).
- `next/image` con `width` y `height` (evita CLS) y `next/font` para tipografías; carga diferida de lo que no se ve.
- SEO básico: `<title>`, `description`, Open Graph, `robots`, `sitemap`, página 404 propia y favicon.
- HTTPS, sin contenido mixto y con cabeceras de seguridad.

### 5 · Retos de excelencia
Elija al menos 3 y justifíquelos con evidencia.
- 100 en las cuatro categorías de Lighthouse (móvil, producción) en 3 páginas.
- LCP ≤ 1,8 s y CLS = 0, con un panel propio de métricas reales (p75) guardadas por su API.
- Prueba en 3 anchos con Playwright (360/768/1024): sin scroll horizontal y 0 violaciones de axe (`@axe-core/playwright`).
- Pruebas de accesibilidad de componentes con axe dentro de Vitest y React Testing Library.
- Funciona sin JavaScript en el flujo principal (mejora progresiva: formularios con `action`, enlaces reales).
- Modo oscuro y alto contraste sin romper el contraste en ningún tema.
- Presupuesto estricto: JavaScript transferido ≤ 120 kB, con `next/dynamic` para lo pesado.
- Navegación accesible: foco movido y título anunciado en cada cambio de ruta, probado con lector de pantalla.
- Impresión (`@media print`) y SEO avanzado (JSON-LD, `sitemap`, imágenes Open Graph).
- Español e inglés con `lang` correcto y formatos `Intl`.

### 6 · Evidencias a entregar
Carpeta `calidad/` del repositorio y un archivo `CALIDAD.md`.
- Informes de Lighthouse (móvil y escritorio) de 3 páginas: una pública, una con formulario y una con sesión iniciada (desde DevTools).
- Capturas de las páginas principales en 360, 768 y 1024 px.
- Resultado de axe y del validador HTML, y la lista de comprobación manual (teclado, zoom 200 %, lector de pantalla) con fecha.
- Tabla de LCP, INP y CLS y qué hizo para mejorarlas (antes y después).
- Los retos elegidos, cada uno con su evidencia y cómo reproducirla.

Todo debe poder demostrarse en vivo en la sustentación.

## 15. Configuración de la IA del proyecto (reto adicional)
Antes de usar un asistente de IA en este proyecto, el estudiante debe diseñar y configurar su propia configuración de IA. No se entrega una configuración hecha: pensarla, construirla y comprobarla es parte del reto. Los requisitos detallados y cómo se evalúan se explican en clase (hoja «Configuración de IA»). La configuración queda versionada en el primer commit de el repositorio y debe cubrir:
- Reglas del proyecto para la IA: un archivo de instrucciones propio (stack, comandos, estructura, lo que sí y lo que no).
- Restricciones de seguridad: la IA no puede leer `.env`, claves ni credenciales, no puede salir de la carpeta del proyecto y las acciones con efecto fuera de su máquina piden permiso.
- Reglas de calidad del código que se comprueban de forma automática, también sobre el código que escriba la IA.
- Evidencia: pruebas propias que demuestren que las restricciones funcionan, guardadas en la carpeta `ia/`, y la bitácora de IA.

Todo debe poder demostrarse en vivo en la sustentación.

## 16. Entregables por hito y lista de seguridad
| Hito | Semana | Peso | Qué debe existir |
| --- | --- | --- | --- |
| 1 | 4 | 15 % | Renderizar un formulario a partir de una definición JSON de ejemplo con campos de texto, número y selección, validados y accesibles. Consume datos con `fetch`, valida entradas y gestiona carga, vacío y error. Repositorio, guía de ejecución y bitácora de IA. Configuración de IA (sección 15) en el primer commit. |
| 2 | 7 | 15 % | Aplicación Next.js/React modular y navegable: componentes reutilizables, rutas, formularios controlados y validados, estados de interfaz, diseño responsivo y pruebas de los casos críticos. |
| 3 | 12 | 15 % | API REST por capas con validación, manejo de errores, persistencia en Firestore, configuración por variables de entorno, `openapi.yaml`, colección de solicitudes y pruebas automatizadas. |
| 4 | 15 | 15 % | Integración completa con Firebase Auth (cookie de sesión, roles), seguridad, pruebas de integración, evidencias de calidad (sección 14), despliegue en Vercel, historial Git y auditoría de la bitácora de IA. Evidencias de la configuración de IA (sección 15) demostradas en vivo. |

Cada estudiante entrega: repositorio con historial de commits propio, URL desplegada, `README` con instrucciones, `openapi.yaml`, colección de solicitudes, bitácora de IA (propósito, evidencia, validación, decisión), carpeta `ia/` con las evidencias de la configuración de IA (sección 15) y debe poder modificar el proyecto en vivo en la sustentación.

Lista de verificación de seguridad:
- [ ] Ningún secreto en Git ni en variables `NEXT_PUBLIC_*` (excepto la configuración web de Firebase, que es pública).
- [ ] Reglas de Firestore: `allow read, write: if false`; el navegador no importa `firebase/firestore`.
- [ ] Cada ruta privada verifica la sesión y la autorización por objeto; `proxy.ts` no es la única defensa.
- [ ] Entradas validadas con Zod; contenido de usuarios escapado o saneado.
- [ ] Cookie de sesión `HttpOnly`, `Secure`, `SameSite`; comprobación de `Origin` al modificar datos.
- [ ] `npm audit` revisado y sin secretos en los logs.
- [ ] Evidencias de calidad de la sección 14 entregadas (Lighthouse, capturas en 360/768/1024, axe, validador HTML).
- [ ] Configuración de IA propia (sección 15): la IA no lee `.env*` ni claves y no sale de la carpeta del proyecto; evidencias en `ia/`.
