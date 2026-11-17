# ADR-0008 · Adaptar la plantilla de agentes al enunciado del constructor de formularios

- **Estado:** Propuesta (los puntos marcados ❓ los decide la persona, idealmente tras consultarlos con el docente)
- **Fecha:** 2026-11-13
- **Quién decide:** persona (no el agente)

## Contexto
El proyecto parte de la plantilla `justojaramillo/library_agents_job` (método, agentes, guard y puertas de calidad), pensada para una biblioteca de préstamos. Los requisitos reales están en `docs/enunciado.md`. En varios puntos la plantilla y el enunciado dicen cosas distintas; este ADR los lista para que nadie (persona ni agente) resuelva la diferencia en silencio.

## Decisión
Se conserva el método, la arquitectura por features y las puertas de calidad de la plantilla, y se cambia el dominio a formularios (`docs/features.md`). Las diferencias se resuelven así:

| # | Tema | Enunciado | Plantilla | Resolución |
| --- | --- | --- | --- | --- |
| 1 | Estructura de carpetas | `src/components`, `src/services`, `src/repositories`, `src/schemas`, `src/lib`, `src/hooks` (§3) | Todo en `app/`: `app/features/<área>/{schema.ts, server/, ui/, tests/}` y `app/shared/` (ADR-0001) | ❓ Se propone **seguir la plantilla**: tiene las mismas capas (servicio → repositorio, esquemas Zod compartidos) y el lint ya vigila sus fronteras. Equivalencias: `src/schemas` → `features/*/schema.ts`; `src/services` → `features/*/server/*-service.ts`; `src/repositories` → `features/*/server/repository*.ts`; `src/lib` → `shared/server/`; `src/components` → `features/*/ui/` y `shared/ui/`. |
| 2 | Formato del JSON de la API | Ejemplos en camelCase: `idToken`, `siguienteCursor`, `respondidoEn` (§9.1–9.4) | Peticiones y respuestas en `snake_case` (AGENTS.md, reglas de código 6) | ❓ Hay que elegir uno. Se propone **camelCase**, porque el enunciado fija nombres concretos (`siguienteCursor`, `detalles`) que se evalúan; exige cambiar la regla 6 y la prueba `tests/project/contracts-style.test.ts`. Firestore usa camelCase en ambos casos (§9.3). |
| 3 | Caché de lecturas públicas | `revalidate` / `s-maxage` (§9.2) | Cache Components activo: prohíbe `export const revalidate` | Se usa `"use cache"` + `cacheLife` en páginas o la cabecera `Cache-Control: s-maxage=…` en el Route Handler de `GET /api/f/:codigo`. Cumple la intención del enunciado sin romper la plantilla. |
| 4 | Pruebas de componentes | Vitest + React Testing Library + jsdom, consultas por rol y etiqueta, al menos 3 (§11) | Entorno `node`, solo `*.test.ts`, componentes con `renderToStaticMarkup` y sin dependencias nuevas | Obligatorio por el enunciado: agregar `jsdom`, `@testing-library/react`, `@testing-library/user-event` y `@testing-library/jest-dom`, con su ADR propio (regla 6 de AGENTS.md), y admitir `*.test.tsx`. Se decide al llegar a F2. |
| 5 | Archivo de entorno | `.env.local` (§13) | `.env` en la raíz | Se usa `.env` (el de la plantilla). Ambos los bloquea el guard y los ignora Git. |
| 6 | Convención de CSS | «módulos CSS o BEM» (§14.4) | Tailwind con tokens de la paleta azul y blanco (`docs/frontend-rules.md`) | ❓ Tailwind con tokens es una convención consistente; confirmar con el docente que la acepta. |
| 7 | Archivos (Vercel Blob) | No se usan: el CSV se genera en el navegador con `Blob` (§5) | ADR-0003 prevé Vercel Blob | No se instala `@vercel/blob`. |
| 8 | Configuración de IA | La diseña y prueba el estudiante, en el primer commit, con evidencias en `ia/` (§15) | Trae guard, permisos, agentes y skills ya hechos | La persona **debe revisarla, adaptarla y justificarla** (qué bloquea, por qué y cómo lo comprueba) y agregar sus propias pruebas en `ia/`. Usar la plantilla tal cual no cubre el reto. |
| 9 | `export const runtime = "nodejs"` | En cada Route Handler (§9) | No lo menciona | Resuelto en F0: **no se escribe**. Con `cacheComponents`, la documentación de Next 16 pide quitarlo y Node.js ya es el runtime por defecto (`02-route-segment-config/runtime.md`). Las rutas corren en Node.js igual. |
| 10 | Nombre del repositorio | `40-constructor-de-formularios` | `library_agents_job` | Se renombra en `package.json`. |

## Alternativas consideradas
- Reestructurar todo a `src/` como pide el enunciado: obliga a reescribir las reglas de ESLint de fronteras, las zonas de los agentes y ADR-0001; mucho trabajo sin cambiar las capas.
- Ignorar la plantilla y crear el proyecto con `create-next-app`: se pierden los agentes, el guard y las puertas de calidad que el curso pide usar.

## Consecuencias
- Los agentes leen `docs/enunciado.md` como fuente de requisitos y este ADR para las diferencias.
- Mientras los puntos ❓ sigan abiertos, F0 no puede aprobarse (el #2 afecta a todos los contratos).
- En la sustentación hay que poder explicar cada equivalencia de la tabla.
