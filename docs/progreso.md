# Progreso

Lo mantiene el orquestador: se actualiza al cerrar cada feature (spec aprobada → construida → `npm run check:full` en verde → `security` → nota en `docs/handoffs/`). Lo leen Claude Code y OpenCode al empezar la sesión.

## Estado
- **Construido:** nada todavía. La plantilla está adaptada al constructor de formularios (`docs/features.md`, `docs/enunciado.md`, ADR-0008) y `npm run check` está en verde.
- **Spec en curso:** ninguna.
- **Siguiente:** F0 (base del proyecto), ver `docs/features.md`. Antes, resolver los puntos ❓ de ADR-0008 (sobre todo el formato camelCase/snake_case del JSON).
- `app/page.tsx` todavía es la portada de la plantilla (biblioteca); la reemplaza F4.

## Decisiones tomadas
- 2026-11-13 · Se parte de la plantilla `library_agents_job` y se adapta al enunciado ([ADR-0008](adr/0008-adaptacion-al-enunciado.md), en estado *Propuesta*).
- 2026-11-13 · Finales de línea LF en todo el repositorio (`.gitattributes`): con `core.autocrlf=true` en Windows, Biome rechazaba todos los archivos.
- 2026-11-13 · `tests/project/guard.test.ts` crea el enlace de prueba como *junction*: en Windows un symlink de carpeta exige modo desarrollador.

## Pendientes de la persona
(Cosas que solo ella puede hacer.)
1. **Configuración de IA (§15 del enunciado), antes del primer commit:** revisar `.claude/settings.json`, `.claude/hooks/guard.ts` y `.agents/guard/rules.ts`, adaptarlos a tu criterio, crear la carpeta `ia/` con tus propias pruebas de que las restricciones funcionan (p. ej. pedirle a la IA que lea `.env` y guardar el bloqueo) y empezar la bitácora (`ia/bitacora.md`).
2. Resolver con el docente los puntos ❓ de ADR-0008 y cambiar su estado a *Aceptada*.
3. Node: en local basta Node 22 (Next exige ≥ 20.9 y `npm run check` pasa); Vercel usa 24 por `engines`. Antes de desplegar, probar con la comprobación de ADR-0007.
- 2026-11-13 · `npm audit fix` aplicado. Quedan 14 alertas (13 moderadas, 1 baja) en dependencias de desarrollo y de `firebase-admin`; solo se quitan con `--force` (baja `eslint-config-next` a 15, cambio incompatible). Revisar de nuevo en F16.
4. Crear tu proyecto de Firebase y el archivo `.env` (pasos en `docs/empezar.md` §1). Ningún agente puede hacerlo.
5. Primer commit propio (con la configuración de IA incluida) y crear el repositorio `40-constructor-de-formularios` en GitHub.
6. Abrir una sesión nueva de Claude Code en esta carpeta para que cargue los agentes, y enviar el primer mensaje de `docs/empezar.md` §4.
