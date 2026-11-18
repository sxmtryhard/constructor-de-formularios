/**
 * Preparación común de las pruebas de componentes (ADR-0009): matchers de jest-dom
 * (`toBeInTheDocument`, `toHaveAccessibleDescription`…) y limpieza del DOM tras cada prueba.
 * Importarlo al inicio de cada `*.test.tsx`, que además declara `// @vitest-environment jsdom`.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
