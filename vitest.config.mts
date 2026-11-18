import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // JSX de las pruebas de componentes (ADR-0009).
  plugins: [react()],
  resolve: {
    // `@/tests/…` apunta a los ayudantes de la raíz; el resto de `@/…` es la carpeta `app/`.
    alias: [
      { find: /^@\/tests\//, replacement: `${resolve(import.meta.dirname, "tests")}/` },
      { find: /^@\//, replacement: `${resolve(import.meta.dirname, "app")}/` },
    ],
  },
  test: {
    // Punto de entrada único (`npm test`): los tests de cada feature viven en su carpeta
    // y `tests/` aporta los del proyecto y los ayudantes compartidos (`tests/helpers`).
    include: ["tests/**/*.test.ts", "app/features/*/tests/**/*.test.{ts,tsx}", "app/shared/tests/**/*.test.{ts,tsx}"],
    // Por defecto Node; las pruebas de componentes (`*.test.tsx`) piden jsdom con
    // `// @vitest-environment jsdom` en la primera línea (ADR-0009).
    environment: "node",
  },
});
