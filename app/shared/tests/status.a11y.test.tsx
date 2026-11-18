// @vitest-environment jsdom
import "@/tests/helpers/dom";
import { axeViolations, describeViolations } from "@/tests/helpers/axe";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorPanel, LoadingSkeleton } from "../ui/status";

describe("Accesibilidad (axe) de los estados de error y carga", () => {
  it("ErrorPanel con detalles, «Reintentar» y enlace «Ingresar» no tiene violaciones", async () => {
    const { container } = render(
      <ErrorPanel
        error={{
          error: "Datos inválidos",
          detalles: [
            { campo: "titulo", mensaje: "El título es obligatorio" },
            { campo: "campos", mensaje: "Máximo 30 campos" },
          ],
        }}
        onRetry={vi.fn<() => void>()}
        loginHref="/ingresar"
      />,
    );

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it("ErrorPanel solo con el mensaje no tiene violaciones", async () => {
    const { container } = render(<ErrorPanel error={{ error: "Sin conexión" }} />);

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it("LoadingSkeleton no tiene violaciones", async () => {
    const { container } = render(<LoadingSkeleton label="Cargando formularios…" />);

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});
