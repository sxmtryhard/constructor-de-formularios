// @vitest-environment jsdom
import "@/tests/helpers/dom";
import { makeField } from "@/tests/helpers/factories";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnswerValue, Field } from "../schema";
import { FormRenderer, type SubmitOutcome } from "../ui/form-renderer";

type SubmitHandler = (valores: Record<string, AnswerValue>) => Promise<SubmitOutcome>;

function okSubmit() {
  return vi.fn<SubmitHandler>(async () => ({ ok: true }));
}

function renderForm(campos: Field[], onSubmit: SubmitHandler) {
  render(
    <FormRenderer
      titulo="Inscripción al club"
      descripcion=""
      campos={campos}
      submitLabel="Enviar"
      onSubmit={onSubmit}
    />,
  );
}

const CIUDADES = ["Bogotá", "Cali", "Medellín", "Pasto", "Tunja", "Neiva"];

/** Rol (selección) y Curso (texto) visible solo si Rol vale «Estudiante». */
function conditionalFields(): Field[] {
  return [
    makeField("nombre", { etiqueta: "Nombre", obligatorio: true }),
    makeField("rol", { tipo: "seleccion", etiqueta: "Rol", opciones: ["Estudiante", "Docente"] }),
    makeField("curso", { etiqueta: "Curso", visible_si: { campo_id: "rol", valor: "Estudiante" } }),
  ];
}

describe("FormRenderer: un control por tipo de campo, encontrable por su etiqueta", () => {
  it("renderiza texto, párrafo, número, fecha, selección y casillas con su etiqueta", () => {
    renderForm(
      [
        makeField("nombre", { etiqueta: "Nombre" }),
        makeField("comentario", { tipo: "parrafo", etiqueta: "Comentario" }),
        makeField("edad", { tipo: "numero", etiqueta: "Edad" }),
        makeField("nacimiento", { tipo: "fecha", etiqueta: "Fecha de nacimiento" }),
        makeField("rol", { tipo: "seleccion", etiqueta: "Rol", opciones: ["Estudiante", "Docente"] }),
        makeField("ciudad", { tipo: "seleccion", etiqueta: "Ciudad", opciones: CIUDADES }),
        makeField("intereses", { tipo: "casillas", etiqueta: "Intereses", opciones: ["Arte", "Ciencia"] }),
      ],
      okSubmit(),
    );

    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByRole("textbox", { name: "Comentario" })).toBeInstanceOf(HTMLTextAreaElement);
    expect(screen.getByRole("spinbutton", { name: "Edad" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de nacimiento")).toHaveAttribute("type", "date");
    expect(screen.getByRole("combobox", { name: "Ciudad" })).toBeInTheDocument();

    const rol = screen.getByRole("group", { name: "Rol" });
    expect(within(rol).getByRole("radio", { name: "Estudiante" })).toBeInTheDocument();
    expect(within(rol).getByRole("radio", { name: "Docente" })).toBeInTheDocument();

    const intereses = screen.getByRole("group", { name: "Intereses" });
    expect(within(intereses).getByRole("checkbox", { name: "Arte" })).toBeInTheDocument();
    expect(within(intereses).getByRole("checkbox", { name: "Ciencia" })).toBeInTheDocument();
  });

  it("marca en la etiqueta los campos obligatorios", () => {
    renderForm([makeField("nombre", { etiqueta: "Nombre", obligatorio: true })], okSubmit());

    expect(screen.getByLabelText(/^Nombre/)).toBeRequired();
    expect(screen.getByLabelText(/obligatorio/)).toBeInTheDocument();
  });
});

describe("FormRenderer: errores asociados al campo", () => {
  it("al enviar con un texto obligatorio vacío muestra el error asociado y no envía", async () => {
    const onSubmit = okSubmit();
    const user = userEvent.setup();
    renderForm([makeField("nombre", { etiqueta: "Nombre", obligatorio: true })], onSubmit);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    const nombre = screen.getByLabelText(/^Nombre/);
    expect(nombre).toHaveAttribute("aria-invalid", "true");
    expect(nombre).toHaveAccessibleDescription(/\S/);
    expect(screen.getByRole("alert")).toHaveTextContent("Nombre");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("al enviar con casillas obligatorias sin marcar, el grupo tiene el error asociado", async () => {
    const onSubmit = okSubmit();
    const user = userEvent.setup();
    renderForm(
      [makeField("intereses", { tipo: "casillas", etiqueta: "Intereses", obligatorio: true, opciones: ["Arte"] })],
      onSubmit,
    );

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(screen.getByRole("group", { name: /^Intereses/ })).toHaveAccessibleDescription(/\S/);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("FormRenderer: lógica condicional (visible_si)", () => {
  it("el campo condicional aparece solo tras elegir el valor esperado en la selección", async () => {
    const user = userEvent.setup();
    renderForm(conditionalFields(), okSubmit());

    expect(screen.queryByLabelText("Curso")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Docente" }));
    expect(screen.queryByLabelText("Curso")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Estudiante" }));
    expect(screen.getByRole("textbox", { name: "Curso" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Docente" }));
    expect(screen.queryByLabelText("Curso")).not.toBeInTheDocument();
  });

  it("también funciona con la selección como lista desplegable", async () => {
    const user = userEvent.setup();
    renderForm(
      [
        makeField("ciudad", { tipo: "seleccion", etiqueta: "Ciudad", opciones: CIUDADES }),
        makeField("barrio", { etiqueta: "Barrio", visible_si: { campo_id: "ciudad", valor: "Pasto" } }),
      ],
      okSubmit(),
    );

    expect(screen.queryByLabelText("Barrio")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Ciudad" }), "Pasto");
    expect(screen.getByRole("textbox", { name: "Barrio" })).toBeInTheDocument();
  });
});

describe("FormRenderer: envío con datos válidos", () => {
  it("llama a onSubmit con los valores de los campos visibles", async () => {
    const onSubmit = okSubmit();
    const user = userEvent.setup();
    renderForm(conditionalFields(), onSubmit);

    await user.type(screen.getByLabelText(/^Nombre/), "Ana");
    await user.click(screen.getByRole("radio", { name: "Estudiante" }));
    await user.type(screen.getByRole("textbox", { name: "Curso" }), "10A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({ nombre: "Ana", rol: "Estudiante", curso: "10A" });
  });

  it("no envía el valor de un campo que quedó oculto", async () => {
    const onSubmit = okSubmit();
    const user = userEvent.setup();
    renderForm(conditionalFields(), onSubmit);

    await user.type(screen.getByLabelText(/^Nombre/), "Ana");
    await user.click(screen.getByRole("radio", { name: "Estudiante" }));
    await user.type(screen.getByRole("textbox", { name: "Curso" }), "10A");
    await user.click(screen.getByRole("radio", { name: "Docente" }));
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({ nombre: "Ana", rol: "Docente" });
  });
});
