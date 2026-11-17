# Nota de entrega — pruebas de la lógica pura de formularios (F0–F14 MVP)

## Qué hice
Pruebas Vitest escritas desde `docs/specs/F0-F14-mvp.md` y `docs/enunciado.md` §8, §10, §11 para el contrato `app/features/forms/schema.ts`:
- Esquema de respuestas generado desde la definición (obligatorio, campo extra → rechazo, 1000 caracteres, texto min/max/patrón, número min/max/tipo, selección, casillas min/max/opción, fecha, obligatorio oculto).
- Visibilidad condicional (`isFieldVisible`, cadena padre oculto, casillas) y `keepVisibleAnswers` (ocultos → `null`).
- `FieldList`/`FormInput`/`Field`/`PublishInput` (30/31 campos, ids repetidos, selección sin opciones, condición posterior/inexistente/propia, claves extra) e `isSafePattern` (seguros, anidados, inválido, referencia hacia atrás, 100/101 caracteres).

## Archivos
- `app/features/forms/tests/answer-schema.test.ts`
- `app/features/forms/tests/visibility.test.ts`
- `app/features/forms/tests/field-list.test.ts`
- `tests/helpers/factories.ts` (nuevo: `makeField`, `makeFields`)

## Cómo verificar
`npx vitest run app/features/forms/tests` → 3 archivos, 62 pruebas, todas pasan. `npx eslint app/features/forms/tests tests/helpers` → 0 errores.

## Qué falta / preguntas
- `npm run format` reformateó también `app/features/forms/schema.ts` (solo formato, fuera de mi zona): el orquestador debe revisarlo y conservarlo.
- Pendiente (§11): pruebas de API (401/400/403-404 con `vi.mock`), de componentes (React Testing Library) y de integración ruta → servicio → repositorio; dependen del backend y del frontend.
- Ambigüedades: ¿una fecha con formato correcto pero imposible (`2026-13-45`) debe rechazarse? Hoy solo se valida el formato. ¿Un número no entero en un campo `numero` es válido? La spec no lo dice; no lo probé.
