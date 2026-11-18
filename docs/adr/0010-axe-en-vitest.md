# ADR-0010 · axe-core para pruebas de accesibilidad en Vitest

- **Estado:** Aceptada
- **Fecha:** 2026-11-17
- **Quién decide:** persona (eligió el reto «Pruebas de accesibilidad de componentes con axe dentro de Vitest y React Testing Library» el 2026-11-17)

## Contexto
El §14.5 pide al menos 3 retos de excelencia con evidencia. Uno de ellos es comprobar con axe la accesibilidad de los componentes dentro de las pruebas de Vitest y React Testing Library ([ADR-0009](0009-pruebas-de-componentes.md)).

## Decisión
Se agrega `axe-core` como dependencia de desarrollo y se usa directamente (`axe.run` sobre el contenedor de RTL) con un ayudante propio en `tests/helpers/axe.ts`.

## Alternativas consideradas
- **`vitest-axe` o `jest-axe`:** son envoltorios de `axe-core`. Agregan otra dependencia y sus tipos dependen de la versión de Jest o Vitest. El ayudante propio son unas pocas líneas.
- **`@axe-core/playwright`:** mide la página real, pero exige instalar Playwright y navegadores. Sería otro reto distinto.

## Consecuencias
- Solo es dependencia de desarrollo; no llega al navegador del usuario.
- jsdom no calcula estilos, así que la regla de contraste de color no es fiable allí: se desactiva en el ayudante. El contraste ya lo cubren `tests/project/palette-contrast.test.ts` y Lighthouse.
