/**
 * Accesibilidad de componentes con axe dentro de Vitest y React Testing Library (ADR-0010).
 * `axeViolations(container)` corre axe sobre el contenedor de RTL y devuelve las violaciones;
 * `describeViolations(violaciones)` las convierte en un mensaje legible para el fallo de la prueba.
 */
import axe, { type AxeResults, type Result, type RuleObject } from "axe-core";

/**
 * Reglas que no se evalúan en jsdom:
 * - `color-contrast`: jsdom no calcula estilos, así que el resultado no es fiable. El contraste
 *   lo cubren `tests/project/palette-contrast.test.ts` y Lighthouse (ADR-0010).
 */
const DISABLED_RULES: RuleObject = {
  "color-contrast": { enabled: false },
};

/** Ejecuta axe sobre `container` y devuelve las violaciones encontradas (vacío = accesible). */
export async function axeViolations(container: Element): Promise<Result[]> {
  const results: AxeResults = await axe.run(container, { rules: DISABLED_RULES });
  return results.violations;
}

/** Mensaje legible: cada regla rota con su impacto, ayuda y los nodos afectados. */
export function describeViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => `    - ${node.html}\n      ${node.failureSummary ?? ""}`);
      return `[${violation.id}] (${violation.impact ?? "sin impacto"}) ${violation.help}\n${nodes.join("\n")}`;
    })
    .join("\n\n");
}
