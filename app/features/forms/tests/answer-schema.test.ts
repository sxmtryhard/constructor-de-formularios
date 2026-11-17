import { makeField } from "@/tests/helpers/factories";
import { describe, expect, it } from "vitest";
import { type AnswerValues, buildAnswerSchema, buildFieldValueSchema, type Field } from "../schema";

/** Rutas (primer segmento) de los errores al validar `values` contra `fields`. */
function errorFields(fields: Field[], values: AnswerValues): string[] {
  const result = buildAnswerSchema(fields).safeParse(values);
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => String(issue.path[0]));
}

function accepts(fields: Field[], values: AnswerValues): boolean {
  return buildAnswerSchema(fields).safeParse(values).success;
}

describe("esquema de respuestas generado desde la definición (§8, §11)", () => {
  describe("caso feliz", () => {
    it("acepta una respuesta completa y válida de todos los tipos", () => {
      const fields = [
        makeField("nombre", { obligatorio: true }),
        makeField("bio", { tipo: "parrafo" }),
        makeField("edad", { tipo: "numero", reglas: { min: 0, max: 120 } }),
        makeField("color", { tipo: "seleccion", opciones: ["rojo", "azul"] }),
        makeField("frutas", { tipo: "casillas", opciones: ["pera", "uva", "kiwi"] }),
        makeField("nacimiento", { tipo: "fecha" }),
      ];
      expect(
        accepts(fields, {
          nombre: "Ana",
          bio: "Hola",
          edad: 30,
          color: "azul",
          frutas: ["pera", "kiwi"],
          nacimiento: "2000-05-20",
        }),
      ).toBe(true);
    });

    it("acepta dejar vacíos los campos opcionales", () => {
      const fields = [makeField("a"), makeField("b", { tipo: "numero" })];
      expect(accepts(fields, {})).toBe(true);
      expect(accepts(fields, { a: null, b: null })).toBe(true);
    });
  });

  describe("campo obligatorio", () => {
    it("un obligatorio sin valor da error en ese campo", () => {
      const fields = [makeField("nombre", { obligatorio: true }), makeField("otro")];
      expect(errorFields(fields, { otro: "x" })).toEqual(["nombre"]);
    });

    it("un obligatorio con texto vacío o null da error en ese campo", () => {
      const fields = [makeField("nombre", { obligatorio: true })];
      expect(errorFields(fields, { nombre: "" })).toEqual(["nombre"]);
      expect(errorFields(fields, { nombre: null })).toEqual(["nombre"]);
    });

    it("casillas obligatorias sin ninguna marcada da error", () => {
      const fields = [makeField("f", { tipo: "casillas", opciones: ["a", "b"], obligatorio: true })];
      expect(errorFields(fields, { f: [] })).toEqual(["f"]);
    });

    it("un obligatorio oculto por su condición NO da error", () => {
      const fields = [
        makeField("asiste", { tipo: "seleccion", opciones: ["si", "no"] }),
        makeField("menu", { obligatorio: true, visible_si: { campo_id: "asiste", valor: "si" } }),
      ];
      expect(accepts(fields, { asiste: "no" })).toBe(true);
    });

    it("un obligatorio visible por su condición SÍ da error si está vacío", () => {
      const fields = [
        makeField("asiste", { tipo: "seleccion", opciones: ["si", "no"] }),
        makeField("menu", { obligatorio: true, visible_si: { campo_id: "asiste", valor: "si" } }),
      ];
      expect(errorFields(fields, { asiste: "si" })).toEqual(["menu"]);
    });
  });

  describe("campo no definido (decisión de la spec: 400, no se descarta)", () => {
    it("rechaza una respuesta con un campo que no existe en la definición", () => {
      const fields = [makeField("nombre")];
      expect(accepts(fields, { nombre: "Ana", intruso: "x" })).toBe(false);
    });
  });

  describe("límite de 1000 caracteres por respuesta", () => {
    it("acepta exactamente 1000 caracteres", () => {
      expect(accepts([makeField("t")], { t: "a".repeat(1000) })).toBe(true);
      expect(accepts([makeField("p", { tipo: "parrafo" })], { p: "a".repeat(1000) })).toBe(true);
    });

    it("rechaza 1001 caracteres en texto y en párrafo", () => {
      expect(errorFields([makeField("t")], { t: "a".repeat(1001) })).toEqual(["t"]);
      expect(errorFields([makeField("p", { tipo: "parrafo" })], { p: "a".repeat(1001) })).toEqual(["p"]);
    });
  });

  describe("texto con mínimo, máximo y patrón", () => {
    const field = makeField("codigo", { reglas: { min: 3, max: 5 } });

    it("respeta los límites de longitud (límite y límite ± 1)", () => {
      expect(accepts([field], { codigo: "ab" })).toBe(false);
      expect(accepts([field], { codigo: "abc" })).toBe(true);
      expect(accepts([field], { codigo: "abcde" })).toBe(true);
      expect(accepts([field], { codigo: "abcdef" })).toBe(false);
    });

    it("exige que el texto completo cumpla el patrón", () => {
      const phone = makeField("tel", { reglas: { patron: "\\d{3}-\\d{4}" } });
      expect(accepts([phone], { tel: "555-1234" })).toBe(true);
      expect(accepts([phone], { tel: "5551234" })).toBe(false);
      expect(accepts([phone], { tel: "x555-1234x" })).toBe(false);
    });

    it("rechaza un número donde se espera texto", () => {
      expect(accepts([makeField("t")], { t: 5 })).toBe(false);
    });
  });

  describe("número", () => {
    const field = makeField("edad", { tipo: "numero", reglas: { min: 18, max: 65 } });

    it("respeta mínimo y máximo (límite y límite ± 1)", () => {
      expect(accepts([field], { edad: 17 })).toBe(false);
      expect(accepts([field], { edad: 18 })).toBe(true);
      expect(accepts([field], { edad: 65 })).toBe(true);
      expect(accepts([field], { edad: 66 })).toBe(false);
    });

    it("rechaza un valor de tipo incorrecto", () => {
      expect(errorFields([field], { edad: "30" })).toEqual(["edad"]);
      expect(accepts([field], { edad: ["30"] })).toBe(false);
    });

    it("acepta 0 cuando no hay mínimo", () => {
      expect(accepts([makeField("n", { tipo: "numero" })], { n: 0 })).toBe(true);
    });
  });

  describe("selección", () => {
    const field = makeField("color", { tipo: "seleccion", opciones: ["rojo", "azul"] });

    it("acepta una opción definida", () => {
      expect(accepts([field], { color: "rojo" })).toBe(true);
    });

    it("rechaza una opción inexistente", () => {
      expect(errorFields([field], { color: "verde" })).toEqual(["color"]);
    });
  });

  describe("casillas", () => {
    const field = makeField("frutas", {
      tipo: "casillas",
      opciones: ["pera", "uva", "kiwi", "mango"],
      reglas: { min: 2, max: 3 },
    });

    it("respeta mínimo y máximo de opciones marcadas", () => {
      expect(accepts([field], { frutas: ["pera"] })).toBe(false);
      expect(accepts([field], { frutas: ["pera", "uva"] })).toBe(true);
      expect(accepts([field], { frutas: ["pera", "uva", "kiwi"] })).toBe(true);
      expect(accepts([field], { frutas: ["pera", "uva", "kiwi", "mango"] })).toBe(false);
    });

    it("rechaza una opción que no existe", () => {
      expect(errorFields([field], { frutas: ["pera", "fresa"] })).toEqual(["frutas"]);
    });

    it("rechaza un texto suelto en lugar de una lista", () => {
      expect(accepts([field], { frutas: "pera" })).toBe(false);
    });
  });

  describe("fecha", () => {
    const field = makeField("dia", { tipo: "fecha" });

    it("acepta el formato AAAA-MM-DD", () => {
      expect(accepts([field], { dia: "2026-11-16" })).toBe(true);
    });

    it("rechaza formatos inválidos", () => {
      expect(errorFields([field], { dia: "16/11/2026" })).toEqual(["dia"]);
      expect(accepts([field], { dia: "mañana" })).toBe(false);
      expect(accepts([field], { dia: "2026-11-16T10:00:00Z" })).toBe(false);
    });
  });

  describe("esquema de un solo valor", () => {
    it("acepta null como vacío y valida el tipo", () => {
      const schema = buildFieldValueSchema(makeField("n", { tipo: "numero" }));
      expect(schema.safeParse(null).success).toBe(true);
      expect(schema.safeParse(3).success).toBe(true);
      expect(schema.safeParse("3").success).toBe(false);
    });
  });
});
