# ADR-0009 · Pruebas de componentes con React Testing Library y jsdom

- **Estado:** Aceptada
- **Fecha:** 2026-11-17
- **Quién decide:** persona (autorizó la instalación el 2026-11-17)

## Contexto
El enunciado (§11) exige al menos 3 pruebas de componentes con Vitest y React Testing Library, consultando por rol y etiqueta como lo haría un usuario. El §13 lista las dependencias de desarrollo para eso. Hasta ahora Vitest corría solo en Node, sin DOM.

## Decisión
Se agregan como dependencias de desarrollo:
- `jsdom`, el DOM simulado;
- `@vitejs/plugin-react`, para el JSX de las pruebas;
- `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` y `@testing-library/jest-dom`.

Vitest sigue usando Node por defecto. Cada archivo `*.test.tsx` pide jsdom con el comentario `// @vitest-environment jsdom`, así las pruebas de lógica y de API no pagan el costo del DOM.

## Alternativas consideradas
- **`happy-dom` en lugar de `jsdom`:** es más rápido, pero menos fiel en la Constraint Validation API, que el formulario usa. Además, el enunciado nombra `jsdom`.
- **Usar jsdom en todas las pruebas:** haría más lentas las pruebas de API, que dependen de `Request` y `Response` de Node.
- **Playwright en lugar de RTL:** sirve para pruebas de punta a punta, no para pruebas de componentes. Queda como posible reto de excelencia (§14.5).

## Consecuencias
- Solo dependencias de desarrollo: no cambian el paquete que llega al navegador.
- `npm audit` puede sumar avisos de desarrollo; se revisan en F16.
- Las pruebas de componentes viven en `app/features/<feature>/tests/*.test.tsx` y `app/shared/tests/*.test.tsx`.
