# Nota de entrega · Backend del MVP (F0–F14)

**Spec:** `docs/specs/F0-F14-mvp.md` (Aprobada). **Agente:** backend. **Fecha:** 2026-11-16.

## Qué se hizo
Todo el backend de la spec: errores de dominio, HTTP, sesión, entorno, Admin SDK, límite de frecuencia, servicios y repositorios (memoria y Firestore) de `auth`, `forms` y `responses`, el contenedor, las 14 rutas de la API, `proxy.ts` y las cabeceras de seguridad de `next.config.ts`.

## Archivos
- `app/shared/server/`: `errors.ts`, `http.ts`, `validation.ts`, `env.ts`, `firebase-admin.ts` (con `server-only`), `session.ts`, `rate-limit.ts`
- `app/features/auth/server/`: `repository.ts` (puerto `AdminAuthPort`), `session-service.ts`
- `app/features/forms/server/`: `repository.ts`, `repository.memory.ts`, `repository.firestore.ts`, `forms-service.ts`
- `app/features/responses/server/`: `repository.ts` (incluye el puerto `FormReader`), `repository.memory.ts`, `repository.firestore.ts`, `responses-service.ts`, `summary.ts`
- `app/features/container.ts`
- `app/api/auth/sesion/route.ts` (POST, DELETE), `app/api/auth/yo/route.ts` (GET), `app/api/formularios/route.ts` (GET, POST), `app/api/formularios/[id]/route.ts` (GET, PUT, DELETE), `.../[id]/publicar/route.ts` (POST), `.../[id]/despublicar/route.ts` (POST), `.../[id]/respuestas/route.ts` (GET), `.../[id]/resumen/route.ts` (GET), `app/api/f/[codigo]/route.ts` (GET), `app/api/f/[codigo]/respuestas/route.ts` (POST)
- `proxy.ts` (raíz), `next.config.ts` (solo `headers()`)

## Contenedor (`@/features/container`) — para `vi.mock`
```ts
getFormsService(): FormsService
getResponsesService(): ResponsesService
getSessionService(): SessionService
getRateLimiters(): { submit: RateLimiter; write: RateLimiter }   // RateLimiter.consume(key: string, now: Date): void (lanza TooManyRequestsError)
```
`DATA_BACKEND=memory` usa repositorios en memoria. El contenedor importa `server-only`: en pruebas de rutas hay que mockearlo (`vi.mock("@/features/container", …)`), y también `@/shared/server/session` (`requerirUsuario`) para no tocar Firebase.

Firmas públicas:
```ts
// forms-service.ts — createFormsService({ repo: FormsRepository, generateCode?: () => string })
create(uid, input: FormInput, now: Date): Promise<Form>
list(uid, query: PageQuery): Promise<FormList>
get(uid, id): Promise<Form>                       // 404 si no existe o es ajeno
update(uid, id, input: FormInput, now): Promise<Form>
remove(uid, id): Promise<void>
publish(uid, id, input: PublishInput, now): Promise<Form>   // 400 sin campos o cierra no futura
unpublish(uid, id, now): Promise<Form>
getPublic(codigo, now): Promise<PublicForm>       // 404 / 410

// responses-service.ts — createResponsesService({ forms: FormReader, responses: ResponsesRepository })
submit(codigo, input: SubmitInput, now): Promise<SubmitResult>   // 404 / 410 / 400 con detalles por campo
list(uid, formId, query: PageQuery): Promise<ResponseList>
summary(uid, formId): Promise<FormSummary>

// session-service.ts — createSessionService({ auth: AdminAuthPort })
createSession(idToken, now): Promise<string>   // 401 si el token no vale o auth_time > 5 min
revokeSession(cookie): Promise<void>

// shared/server/session.ts
requerirUsuario(request: Request, verifier?: TokenVerifier): Promise<SessionUser>   // 401
// shared/server/http.ts
manejar(handler), leerJson(request, Esquema, maxBytes = 65536), exigirOrigen(request), json(body, status?, headers?), noContent(), ipDe(request), queryDe(request)
```
Dobles para pruebas: `MemoryFormsRepository` (además tiene `incrementResponses(formId)`) y `new MemoryResponsesRepository(onAdded?)`.

## Decisiones tomadas aquí (revisar)
1. **Sin `export const runtime = "nodejs"`:** con `cacheComponents` la doc de Next 16 (`route-segment-config/runtime.md`) dice que hay que quitarlo; Node.js ya es el runtime por defecto. La spec lo pide: conviene corregir la tabla.
2. **Listado de formularios:** se leen hasta 1000 del autor y se ordenan en memoria, así no hace falta un índice compuesto (`autorUid` + `creadoEn`).
3. **Resumen:** usa todas las respuestas (máx. 5000), contadas con los campos de la versión vigente por id; `total` = todas las respuestas leídas.
4. **Versionado:** en formularios que ya se publicaron, `versiones/{version}` se reescribe siempre que cambian los campos, aunque la versión no suba (cuando aún no hay respuestas).
5. **Origin:** si falta la cabecera `Origin` en un método que modifica, se responde 403.
6. Borrar un formulario también borra `codigos/{codigo}`.
7. El nombre de la cookie está repetido en `shared/server/session.ts` (`SESSION_COOKIE_NAME = "sesion"`), porque `shared` no puede importar `features`.

## Cómo verificar
`npx eslint` sobre la zona de backend da 0 errores. `npx tsc --noEmit` no muestra errores en estos archivos. `npm test` pasa (160). Una prueba rápida de los servicios en memoria salió bien (publicar, enviar, 400 por campo sobrante y obligatorio, 404 si es ajeno, la versión sube con respuestas, 410 si está cerrado, resumen); el script era temporal y lo borré.

## Pendiente
- `npm run typecheck` hoy falla solo por páginas del frontend (`app/f/[codigo]`, `app/formularios/...`, `app/login`), por los tipos `PageProps` de `next typegen` y porque falta `responses-view`. No es zona de backend.
- El aviso «más de 5000 respuestas» no tiene campo en `FormSummary`. Si se quiere mostrar, el orquestador tiene que añadirlo al contrato.
- En modo `memory` la sesión sigue necesitando Firebase Auth.
- Faltan pruebas de servicios y rutas (zona tests). No se hizo `npm run build`.
