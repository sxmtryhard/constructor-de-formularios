# Bitácora de IA

Formato pedido por el enunciado: **propósito · evidencia · validación · decisión**. Las entradas marcadas «(borrador IA)» las redactó el asistente a partir de lo que hizo. **Revísalas, corrígelas con tus palabras y agrega las tuyas.** La bitácora es tuya y se audita en el hito 4.

| Fecha | Propósito | Evidencia | Validación | Decisión |
| --- | --- | --- | --- | --- |
| 2026-11-13 | Instalar y adaptar la plantilla de agentes `library_agents_job` al enunciado (borrador IA) | Commit `6ea84a7`; `docs/adr/0008-adaptacion-al-enunciado.md` | `npm run check` en verde; finales de línea LF corregidos | Se aceptó; los puntos ❓ del ADR-0008 quedan para el docente |
| 2026-11-16 | Construir el MVP F0–F14 con agentes backend, frontend y tests (borrador IA) | Commit `81d801d`; `docs/specs/F0-F14-mvp.md`; notas en `docs/handoffs/` | 198 pruebas y `npm run check:full` en verde | Se aceptó; las decisiones marcadas «(IA)» en la spec están por revisar |
| 2026-11-16 | Revisión de seguridad con el agente `security` (borrador IA) | Commit `5cbc225` | Pruebas de regresión de ReDoS en `field-list.test.ts` | Se corrigieron el ReDoS (alta) y la IP del límite de frecuencia (media); los hallazgos bajos quedan en `docs/progreso.md` |
| 2026-11-17 | Corregir el 400 que exponía los nombres de las variables de entorno en producción (borrador IA) | Commit `ebf8946` | En producción `/api/f/x` pasó de 400 a 500 genérico y, con las variables configuradas, a 404 | Se aceptó |
| 2026-11-17 | Configurar las variables de Firebase en Vercel (borrador IA) | — | `/api/auth/yo` → 401 y `/api/f/zzzzzzzzzz` → 404 en producción | La IA se negó a escribir la clave privada en Vercel; lo hizo la persona. **La clave quedó expuesta en el chat y hay que rotarla.** |
| 2026-11-17 | `openapi.yaml`, colección Bruno, pruebas de 413/415/429 y evidencias de `calidad/` (borrador IA) | `openapi.yaml`, `bruno/`, `app/features/responses/tests/limits-routes.test.ts`, `calidad/CALIDAD.md` | `npm run check`; referencias de OpenAPI comprobadas; capturas a 360, 768 y 1024 px | El clasificador bloqueó instalar React Testing Library sin autorización explícita. La persona la autorizó después y se instaló con [ADR-0009](../docs/adr/0009-pruebas-de-componentes.md) |
