import { makeField } from "@/tests/helpers/factories";
import { describe, expect, it } from "vitest";
import { isFieldVisible, keepVisibleAnswers } from "../schema";

const asiste = makeField("asiste", { tipo: "seleccion", opciones: ["si", "no"] });
const menu = makeField("menu", {
  tipo: "seleccion",
  opciones: ["carne", "vegano"],
  visible_si: { campo_id: "asiste", valor: "si" },
});
const alergias = makeField("alergias", { visible_si: { campo_id: "menu", valor: "vegano" } });
const fields = [asiste, menu, alergias];

describe("visibilidad condicional (RF-03)", () => {
  it("un campo sin condición siempre es visible", () => {
    expect(isFieldVisible(asiste, fields, {})).toBe(true);
  });

  it("es visible cuando el campo del que depende vale lo esperado", () => {
    expect(isFieldVisible(menu, fields, { asiste: "si" })).toBe(true);
  });

  it("está oculto cuando el campo del que depende vale otra cosa", () => {
    expect(isFieldVisible(menu, fields, { asiste: "no" })).toBe(false);
  });

  it("está oculto cuando el campo del que depende está vacío", () => {
    expect(isFieldVisible(menu, fields, {})).toBe(false);
    expect(isFieldVisible(menu, fields, { asiste: null })).toBe(false);
  });

  it("con casillas, es visible si las marcadas incluyen el valor", () => {
    const deportes = makeField("deportes", { tipo: "casillas", opciones: ["futbol", "tenis"] });
    const raqueta = makeField("raqueta", { visible_si: { campo_id: "deportes", valor: "tenis" } });
    const list = [deportes, raqueta];
    expect(isFieldVisible(raqueta, list, { deportes: ["futbol", "tenis"] })).toBe(true);
    expect(isFieldVisible(raqueta, list, { deportes: ["futbol"] })).toBe(false);
    expect(isFieldVisible(raqueta, list, { deportes: [] })).toBe(false);
  });

  it("en cadena, si el padre está oculto el hijo también, aunque su valor coincida", () => {
    expect(isFieldVisible(alergias, fields, { asiste: "si", menu: "vegano" })).toBe(true);
    expect(isFieldVisible(alergias, fields, { asiste: "no", menu: "vegano" })).toBe(false);
  });
});

describe("solo se guardan las respuestas de campos visibles", () => {
  it("los campos ocultos quedan en null aunque el cliente mande valor", () => {
    const result = keepVisibleAnswers(fields, { asiste: "no", menu: "vegano", alergias: "maní" });
    expect(result).toEqual({ asiste: "no", menu: null, alergias: null });
  });

  it("conserva los valores de los campos visibles", () => {
    const result = keepVisibleAnswers(fields, { asiste: "si", menu: "vegano", alergias: "maní" });
    expect(result).toEqual({ asiste: "si", menu: "vegano", alergias: "maní" });
  });

  it("los campos visibles sin respuesta quedan en null", () => {
    const result = keepVisibleAnswers(fields, { asiste: "si" });
    expect(result).toEqual({ asiste: "si", menu: null, alergias: null });
  });
});
