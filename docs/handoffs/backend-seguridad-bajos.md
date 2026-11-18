## Entrega: backend · hallazgos bajos/medios de la revisión de seguridad
**Hecho:**
- Parámetros de URL: `paramValido(valor, esquema, mensaje)` en `app/shared/server/validation.ts`; las rutas `[id]` usan `FormIdParam` y las `[codigo]` `PublicCodeParam`. Si no cumple → `NotFoundError("Formulario no encontrado")` (404, mismo mensaje que el inexistente), sin consultar la base. Se valida donde antes se leía `context.params`, así que `exigirOrigen`, sesión y límite de frecuencia siguen yendo antes.
- Documentos corruptos: `parseStored(esquema, dato)` (validation.ts) lanza `CorruptDataError` (errors.ts, no es `DomainError`) → 500 genérico vía `manejar`. Lo usan todas las lecturas de los repositorios Firestore de forms (formulario, listado, versiones, código) y responses. Los `.parse` de escritura quedan igual.
- `DELETE /api/auth/sesion` llama a `exigirOrigen(request)`.
- Borrar formulario: la transacción sigue borrando `codigos/{codigo}` y el documento; después `db.recursiveDelete(ref)` (existe en `@google-cloud/firestore` 9.4.0) borra `respuestas` y `versiones`. En memoria: `MemoryFormsRepository.delete` borra también las versiones y la nueva subclase `CascadingMemoryFormsRepository` avisa a `MemoryResponsesRepository.removeByForm` (conectado en `container.ts`).
- `rate-limit.ts`: comentario sobre el límite por instancia en Vercel y el Firewall de Vercel como defensa global.
**Archivos:**
- `app/shared/server/{errors,validation,rate-limit}.ts`
- `app/api/auth/sesion/route.ts`, `app/api/formularios/[id]/{route,publicar/route,despublicar/route,respuestas/route,resumen/route}.ts`, `app/api/f/[codigo]/{route,respuestas/route}.ts`
- `app/features/forms/server/{repository,repository.firestore,repository.memory}.ts`, `app/features/responses/server/{repository.firestore,repository.memory}.ts`, `app/features/container.ts`
**Cómo verificar:** `npm run check` → formato, lint y tipos sin errores; 253 pruebas pasan.
**Decisiones:**
- La cascada en memoria va en una subclase porque `MemoryFormsRepository` ya tenía el máximo de 10 funciones.
- `recursiveDelete` se ejecuta tras la transacción: si falla a medias, el formulario ya no es accesible (404) y solo quedan subdocumentos huérfanos; el error sale como 500.
**Pendiente / bloqueos:**
- Sin pruebas nuevas (zona de tests): 404 para `id`/`codigo` mal formados, 500 ante documento corrupto, 403 en `DELETE /api/auth/sesion` sin `Origin`, cascada del borrado en memoria. El borrado recursivo en Firestore solo se puede probar con el emulador.
- CSP con `'unsafe-inline'` sigue abierto (no era de esta tarea).
**Dudas de la especificación:**
- Ninguna.
