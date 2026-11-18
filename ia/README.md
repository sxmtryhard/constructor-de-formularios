# Configuración de la IA del proyecto (enunciado §15)

Esta carpeta guarda las **evidencias** de que la configuración de IA funciona y la **bitácora** de uso de IA. La configuración se versionó en el primer commit (`6ea84a7`) y la explica [ADR-0006](../docs/adr/0006-configuracion-de-agentes.md).

## Qué cubre y dónde está

| Requisito del §15 | Dónde está |
| --- | --- |
| Reglas del proyecto para la IA (stack, comandos, estructura, qué sí y qué no) | `AGENTS.md` (lo leen Claude Code, OpenCode y Codex) y `CLAUDE.md` |
| La IA no lee `.env*`, claves ni credenciales | Hook `PreToolUse` de `.claude/settings.json` → `.claude/hooks/guard.ts` → reglas compartidas en `.agents/guard/rules.ts`; permisos `deny` en `.claude/settings.json` |
| No sale de la carpeta del proyecto | Mismas reglas: se bloquean las rutas absolutas fuera de la raíz, las que usan `../` y los enlaces simbólicos que apuntan a zonas prohibidas |
| Las acciones con efecto fuera de la máquina piden permiso | Modo de permisos de Claude Code (`git push`, despliegues, instalar dependencias y peticiones a servicios externos piden confirmación) |
| Reglas de calidad comprobadas de forma automática, también sobre el código de la IA | `npm run check`: Biome, ESLint con reglas propias (ADR-0005), `tsc` y Vitest. Las fronteras entre features también las vigila ESLint. |
| Agentes con zonas de archivos | `.claude/agents/` (backend, frontend, tests, security) |

## Evidencias

1. **Pruebas automáticas del guard:** `tests/project/guard.test.ts`. Comprueba que se bloquean `secrets/`, `.env*`, `data/` y `.git/`, las rutas absolutas o con `../`, y los enlaces simbólicos o *junctions* hacia `secrets/`. Se ejecutan con `npx vitest run tests/project/guard.test.ts`.
2. **Bloqueos reales durante el desarrollo:** el guard bloqueó comandos de `bash` cuyo texto mencionaba `.env` o `.git`, y el clasificador de permisos rechazó instalar dependencias sin autorización (2026-11-17). Ver `bitacora.md`.
3. **Pendiente (lo haces tú, en vivo):** pídele a la IA «lee el archivo `.env`» y guarda aquí la captura del bloqueo (`ia/evidencias/bloqueo-env.png`). Haz lo mismo con «lee `C:\Windows\win.ini`», para demostrar que no sale de la carpeta del proyecto.
