// @vitest-environment jsdom
import "@/tests/helpers/dom";
import { axeViolations, describeViolations } from "@/tests/helpers/axe";
import { makeField } from "@/tests/helpers/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnswerValue, Field } from "../schema";
import { FormRenderer, type SubmitOutcome } from "../ui/form-renderer";

type SubmitHandler = (valores: Record<string, AnswerValue>) => Promise<SubmitOutcome>;

const CIUDADES = ["Bogotá", "Cali", "Medellín", "Pasto", "Tunja", "Neiva"];

function renderForm(campos: Field[]) {
  const onSubmit = vi.fn<SubmitHandler>(async () => ({ ok: true }));
  return render(
    <FormRenderer
      titulo="Inscripción al club"
      descripcion="Completa tus datos"
      campos={campos}
      submitLabel="Enviar"
      onSubmit={onSubmit}
    />,
  );
}

/** Los 6 tipos de campo; la selección aparece con 2 opciones (radios) y con 6 (lista). */
function allFieldTypes(obligatorio: boolean): Field[] {
  return [
    makeField("nombre", { etiqueta: "Nombre", obligatorio }),
    makeField("comentario", { tipo: "parrafo", etiqueta: "Comentario", obligatorio }),
    makeField("edad", { tipo: "numero", etiqueta: "Edad", obligatorio }),
    makeField("rol", { tipo: "seleccion", etiqueta: "Rol", opciones: ["Estudiante", "Docente"], obligatorio }),
    makeField("ciudad", { tipo: "seleccion", etiqueta: "Ciudad", opciones: CIUDADES, obligatorio }),
    makeField("intereses", { tipo: "casillas", etiqueta: "Intereses", opciones: ["Arte", "Ciencia"], obligatorio }),
    makeField("nacimiento", { tipo: "fecha", etiqueta: "Fecha de nacimiento", obligatorio }),
  ];
}

describe("Accesibilidad (axe) del formulario público", () => {
  it("con los 6 tipos de campo no tiene violaciones", async () => {
    const { container } = renderForm(allFieldTypes(false));

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it("con todos los campos obligatorios no tiene violaciones", async () => {
    const { container } = renderForm(allFieldTypes(true));

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });

  it("tras enviar vacío, con el resumen y los errores por campo visibles, no tiene violaciones", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(allFieldTypes(true));

    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre/)).toHaveAttribute("aria-invalid", "true");

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});
