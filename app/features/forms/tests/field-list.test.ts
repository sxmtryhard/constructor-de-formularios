import { makeField, makeFields } from "@/tests/helpers/factories";
import { describe, expect, it } from "vitest";
import { Field, FieldList, FormInput, isSafePattern, PublishInput } from "../schema";

describe("lista de campos de un formulario (§8)", () => {
  it("acepta un formulario sin campos y uno con 1 campo", () => {
    expect(FieldList.safeParse([]).success).toBe(true);
    expect(FieldList.safeParse(makeFields(1)).success).toBe(true);
  });

  it("acepta exactamente 30 campos", () => {
    expect(FieldList.safeParse(makeFields(30)).success).toBe(true);
  });

  it("rechaza 31 campos", () => {
    expect(FieldList.safeParse(makeFields(31)).success).toBe(false);
  });

  it("rechaza ids de campo repetidos", () => {
    expect(FieldList.safeParse([makeField("a"), makeField("a")]).success).toBe(false);
  });

  it("rechaza selección o casillas sin opciones", () => {
    expect(FieldList.safeParse([makeField("s", { tipo: "seleccion" })]).success).toBe(false);
    expect(FieldList.safeParse([makeField("c", { tipo: "casillas" })]).success).toBe(false);
    expect(FieldList.safeParse([makeField("s", { tipo: "seleccion", opciones: ["x"] })]).success).toBe(true);
  });

  it("acepta una condición que apunta a un campo anterior", () => {
    const list = [makeField("a"), makeField("b", { visible_si: { campo_id: "a", valor: "x" } })];
    expect(FieldList.safeParse(list).success).toBe(true);
  });

  it("rechaza una condición que apunta a un campo posterior", () => {
    const list = [makeField("b", { visible_si: { campo_id: "a", valor: "x" } }), makeField("a")];
    expect(FieldList.safeParse(list).success).toBe(false);
  });

  it("rechaza una condición que apunta a un campo inexistente", () => {
    const list = [makeField("a"), makeField("b", { visible_si: { campo_id: "nada", valor: "x" } })];
    expect(FieldList.safeParse(list).success).toBe(false);
  });

  it("rechaza una condición que apunta al propio campo", () => {
    const list = [makeField("a", { visible_si: { campo_id: "a", valor: "x" } })];
    expect(FieldList.safeParse(list).success).toBe(false);
  });

  it("rechaza un patrón peligroso al guardar el campo", () => {
    expect(FieldList.safeParse([makeField("a", { reglas: { patron: "(a+)+" } })]).success).toBe(false);
  });
});

describe("campo: claves desconocidas rechazadas", () => {
  it("rechaza una clave extra en el campo", () => {
    expect(Field.safeParse({ ...makeField("a"), color: "rojo" }).success).toBe(false);
  });

  it("rechaza una clave extra en las reglas", () => {
    const field = makeField("a");
    expect(Field.safeParse({ ...field, reglas: { ...field.reglas, flags: "g" } }).success).toBe(false);
  });

  it("rechaza un tipo de campo que no existe", () => {
    expect(Field.safeParse({ ...makeField("a"), tipo: "archivo" }).success).toBe(false);
  });
});

describe("cuerpo de crear o editar un formulario", () => {
  const valid = { titulo: "Encuesta", descripcion: "", campos: makeFields(2) };

  it("acepta un formulario válido", () => {
    expect(FormInput.safeParse(valid).success).toBe(true);
  });

  it("rechaza claves desconocidas (por ejemplo, intentar fijar el autor)", () => {
    expect(FormInput.safeParse({ ...valid, autor_uid: "otro" }).success).toBe(false);
  });

  it("rechaza un título vacío", () => {
    expect(FormInput.safeParse({ ...valid, titulo: "   " }).success).toBe(false);
  });

  it("rechaza 31 campos", () => {
    expect(FormInput.safeParse({ ...valid, campos: makeFields(31) }).success).toBe(false);
  });
});

describe("publicar", () => {
  it("acepta sin fecha de cierre o con fecha ISO", () => {
    expect(PublishInput.safeParse({ cierra: null }).success).toBe(true);
    expect(PublishInput.safeParse({ cierra: "2026-12-01T00:00:00Z" }).success).toBe(true);
  });

  it("rechaza una fecha mal formada o claves extra", () => {
    expect(PublishInput.safeParse({ cierra: "1 de diciembre" }).success).toBe(false);
    expect(PublishInput.safeParse({ cierra: null, codigo: "abc" }).success).toBe(false);
  });
});

describe("límite de complejidad del patrón (ReDoS, §8)", () => {
  it.each(["[a-z]+", "\\d{3}-\\d{4}", "^[A-Z]{2}\\d+$"])("acepta el patrón seguro %s", (pattern) => {
    expect(isSafePattern(pattern)).toBe(true);
  });

  it.each(["(a+)+", "(a*)*", "(\\w+\\s?)*", "(a|b+){2,}"])("rechaza el cuantificador anidado %s", (pattern) => {
    expect(isSafePattern(pattern)).toBe(false);
  });

  it("rechaza un patrón que no compila", () => {
    expect(isSafePattern("(")).toBe(false);
  });

  it("rechaza referencias hacia atrás", () => {
    expect(isSafePattern("(a)\\1")).toBe(false);
  });

  it("acepta 100 caracteres y rechaza 101", () => {
    expect(isSafePattern("a".repeat(100))).toBe(true);
    expect(isSafePattern("a".repeat(101))).toBe(false);
  });
});
