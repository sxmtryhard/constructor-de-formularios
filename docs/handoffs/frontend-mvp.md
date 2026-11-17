# Nota de entrega — Frontend del MVP (F0–F14)

- **Agente:** frontend · **Spec:** `docs/specs/F0-F14-mvp.md` (Aprobada) · **Fecha:** 2026-11-16

## Qué se hizo
Interfaz completa del MVP que consume la API de la spec solo con `fetch` (mismo origen, `credentials: "same-origin"`); cada respuesta se valida en el mismo punto con el esquema del contrato (`apiJson(url, Esquema)` → `Esquema.safeParse(await res.json())`) y los errores con `ErrorBody`.

- **Layout:** `header` con `nav aria-label="Principal"` (Inicio, Mis formularios, Ingresar/Salir según `GET /api/auth/yo`), `main id="contenido"`, `footer`, enlace «Saltar al contenido», metadata con plantilla de título. `loading.tsx`, `error.tsx` (con reintento), `not-found.tsx`.
- **Portada** (`/`): nueva, del constructor.
- **`/login`:** ingresar y crear cuenta (Firebase Auth en el navegador, `autocomplete` correcto, se puede pegar) → `getIdToken()` → `POST /api/auth/sesion { id_token }` → `?siguiente` (solo rutas internas) o `/formularios`. Salir: `DELETE /api/auth/sesion` + `signOut`. Si faltan las `NEXT_PUBLIC_FIREBASE_*`, se muestra un error claro.
- **`/formularios`:** esqueleto de carga, vacío, error con reintento (y enlace a ingresar si es 401), `aria-live`; «Nuevo formulario» (POST con título por defecto y 0 campos → editor); estado en texto (Borrador/Publicado/Cerrado), total de respuestas, Editar/Respuestas, borrar con confirmación en `<dialog>`.
- **`/formularios/[id]/editar`:** `useReducer` (`builder-reducer.ts`); paleta de tipos con botón «Agregar» y arrastre nativo (detección `'draggable' in div` con `useSyncExternalStore`); ordenar con «Subir/Bajar» o arrastrando (asa «Arrastrar» + ranuras «Soltar aquí» que también funcionan con clic); ids `campo_N`; tope de 30; etiqueta, obligatorio, opciones, mín./máx./patrón, «Mostrar si [campo anterior] vale [valor]» (condiciones rotas se quitan al mover/borrar); validación local con `FormInput` y errores `detalles` del servidor; «Guardar y publicar» con `datetime-local` → ISO UTC, enlace `/f/<codigo>` con «Copiar enlace», despublicar; vista previa con el mismo renderer.
- **`/f/[codigo]`:** un componente por tipo (`field-inputs.tsx`); selección con radios (≤ 5 opciones) o `<select>`; casillas en `fieldset/legend`; atributos nativos + `setCustomValidity` con el mensaje de `buildAnswerSchema`; si existe `checkValidity` se suman los errores nativos; campos ocultos no se muestran ni se envían; errores junto al campo (`aria-describedby`, `aria-invalid`) y resumen `role="alert"`; 400 por campo, 404, 410, «Gracias» (201).
- **`/formularios/[id]/respuestas`:** resumen por pregunta (barras decorativas + número y % en texto, promedio/mín./máx.), tabla con `caption`, `th scope`, fecha en `<time>`, versión, contenedor `overflow-x-auto` con nombre accesible; «Cargar más» con `siguiente_cursor`; CSV de todas las páginas (`limite=100`, hasta 50 páginas) con `Blob` y alternativa «Copiar CSV»; escape de comillas/comas/saltos y `'` delante de `= + - @`.

## Archivos
- Rutas: `app/layout.tsx`, `app/page.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/login/page.tsx`, `app/formularios/page.tsx`, `app/formularios/[id]/editar/page.tsx`, `app/formularios/[id]/respuestas/page.tsx`, `app/f/[codigo]/page.tsx`, `app/globals.css` (clases `btn-*`, `field-input`, `field-check`, `link`, fondo de `dialog`, todo con tokens).
- `app/shared/ui/`: `firebase-client.ts`, `api.ts`, `status.tsx`.
- `app/features/auth/ui/`: `login-form.tsx`, `session-nav.tsx`.
- `app/features/forms/ui/`: `form-list.tsx`, `builder-reducer.ts`, `form-builder.tsx`, `field-editor.tsx`, `field-palette.tsx`, `publish-panel.tsx`, `field-inputs.tsx`, `form-renderer.tsx`, `public-form-view.tsx`.
- `app/features/responses/ui/`: `responses-view.tsx`, `summary-view.tsx`, `csv.ts`.

## Cómo verificar
- `npm run format`, `npx eslint` sobre los archivos de arriba: 0 errores. `npx tsc --noEmit`: 0 errores. `npm run build`: compila (12 páginas).
- `npm run lint` completo: 1 error **fuera de mi zona**: `.codex/hooks/guard.ts` no está en `allowDefaultProject` de `eslint.config.mjs`.
- Manual: crear cuenta → «Nuevo formulario» → agregar campos (clic y arrastre) → guardar → publicar → abrir `/f/<codigo>` → enviar vacío/erróneo/válido → ver respuestas, resumen y CSV.

## Pendiente
- **Revisión visual a 360/768/1024 px: NO hecha en navegador** (no tuve uno). El diseño es mobile-first (una columna base, `md:` 2 columnas, `lg:` panel lateral en el editor) y la tabla se desplaza en su propio contenedor, pero hay que comprobarlo.
- El contenedor de la tabla no lleva `tabIndex=0` (el lint lo prohíbe en elementos no interactivos); los navegadores actuales ya hacen enfocables los contenedores con desplazamiento.
- Decisión (IA) de interfaz para revisar: selección única con radios hasta 5 opciones y `<select>` a partir de 6.
- Formato de `detalles[].campo` en el 400 de envío: se acepta `x` o `valores.x`; confirmar con backend.
- Durante `npm run build`, Next mostró un aviso de vulnerabilidad conocida de la versión 16.4.3 con una instrucción de ejecutar `next upgrade`; no la ejecuté (cambiaría dependencias; lo decide la persona).
