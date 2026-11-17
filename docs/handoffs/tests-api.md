# Nota de entrega · Pruebas de API, integración y sesión

**Spec:** `docs/specs/F0-F14-mvp.md` (Aprobada) + `docs/enunciado.md` §11. **Agente:** tests. **Fecha:** 2026-11-16.

## Qué se hizo
- Pruebas de rutas que llaman a los manejadores exportados con `NextRequest`. `@/features/container` se sustituye con `vi.mock` por los **servicios reales sobre repositorios en memoria**. `@/shared/server/session` se sustituye por el `requerirUsuario` real con un verificador doble: la cookie `sesion=valida-<uid>` vale y cualquier otra no. `server-only` también se sustituye.
- El tiempo se controla con `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime`, porque las rutas usan `new Date()`. No se usa el reloj real ni `setTimeout`.
- Integración ruta → servicio → repositorio del caso crítico de versionado.
- Servicio de sesión con un doble de `AdminAuthPort`.

## Archivos
- `tests/helpers/api.ts`: banco de pruebas (`resetHarness`, `currentHarness`, `fakeVerifier`, `apiRequest`, `params`).
- `app/features/forms/tests/api-routes.test.ts` (21 pruebas): 401 sin sesión o con una cookie inválida, aislamiento del listado, 30 campos → 201, 31 campos → 400 con detalles, `(a+)+` → 400, clave extra → 400 con `detalles` que la nombran, 415, Origin distinto o ausente → 403 (crear y enviar), 404 por ajeno (GET/PUT) o inexistente, envío válido → 201 v1, campo extra en `valores` → 400, clave extra en el cuerpo → 400, código inexistente → 404, cierre: 201 antes y 410 después (también en `GET /api/f/:codigo`).
- `app/features/responses/tests/versioning-integration.test.ts` (3 pruebas): crear → publicar → responder → cambiar la etiqueta y guardar → `version` 2; la respuesta anterior conserva `version: 1` y en `versiones` aparecen las definiciones v1 y v2; la nueva respuesta queda en v2. Guardar sin cambiar `campos` no sube la versión. Un obligatorio vacío (`""` u omitido) → 400 con detalle para ese campo.
- `app/features/auth/tests/session-service.test.ts` (6 pruebas): inicio hace 1 min → cookie con `expiresIn` de 5 días; hace 5 min + 1 s y hace 10 min → 401; token inválido → 401; cerrar sesión revoca o, con una cookie inválida, no falla.

## Cómo verificar
`npx vitest run` → 190 de 190 pasan. `npx eslint tests/helpers/api.ts app/features/*/tests/*.test.ts` → 0 errores. `npx tsc --noEmit` no da errores en estos archivos. `npm run format` aplicado.

## Fallos contra la spec
Ninguno: todas las pruebas pasan con el código actual.

## Preguntas / pendiente
1. El borde exacto de «inicio reciente» (justo 300 s) no está definido en la spec («≤ 5 min» en la nota de backend). No se probó el valor exacto: ¿cuenta como reciente?
2. Que falte la cabecera `Origin` → 403 sale de una decisión de backend (nota `backend-mvp.md`, punto 5), no de la spec. La prueba lo fija; si la persona decide otra cosa, hay que ajustarla.
3. Falta probar 413 (> 64 KB) y 429 (límite de frecuencia), y las pruebas de componentes con React Testing Library del §11 (≥ 3). Para estas últimas hace falta un entorno `jsdom`, que hoy no está en la configuración de Vitest. Añadirlo es una dependencia nueva y necesita un ADR.
