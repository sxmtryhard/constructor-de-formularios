import { describe, expect, it } from "vitest";
import { FormIdParam, PublicCodeParam } from "@/features/forms/schema";
import { PageQuery } from "@/shared/schema";

describe("FormIdParam: forma de un :id de formulario", () => {
  it.each([
    ["1 carácter (mínimo)", "a"],
    ["64 caracteres (límite)", "a".repeat(64)],
    ["un UUID", "3f2b8c1e-9d4a-4e7b-8a6c-1b2c3d4e5f60"],
    ["letras mayúsculas, minúsculas, dígitos y guion", "AbC-123-xyz"],
  ])("acepta %s", (_caso, value) => {
    expect(FormIdParam.safeParse(value).success).toBe(true);
  });

  it.each([
    ["vacío (0 caracteres)", ""],
    ["65 caracteres (límite + 1)", "a".repeat(65)],
    ["un símbolo $", "id$raro"],
    ["un espacio", "con espacio"],
    ["una barra", "a/b"],
    ["un guion bajo", "con_guion_bajo"],
    ["un punto", "a.b"],
    ["una letra acentuada", "formulário"],
    ["un salto de línea al final", "abc\n"],
  ])("rechaza %s", (_caso, value) => {
    expect(FormIdParam.safeParse(value).success).toBe(false);
  });
});

describe("PublicCodeParam: forma de un :codigo público", () => {
  it.each([
    ["1 carácter (mínimo)", "a"],
    ["20 caracteres (límite)", "a".repeat(20)],
    ["minúsculas y dígitos", "abc123"],
  ])("acepta %s", (_caso, value) => {
    expect(PublicCodeParam.safeParse(value).success).toBe(true);
  });

  it.each([
    ["vacío (0 caracteres)", ""],
    ["21 caracteres (límite + 1)", "a".repeat(21)],
    ["mayúsculas", "MAYUS"],
    ["una sola mayúscula", "abcD"],
    ["un guion", "con-guion"],
    ["un espacio", "a b"],
    ["un salto de línea al final", "abc\n"],
  ])("rechaza %s", (_caso, value) => {
    expect(PublicCodeParam.safeParse(value).success).toBe(false);
  });
});

describe("PageQuery.cursor: forma del cursor de paginación", () => {
  it("sin cursor es válido", () => {
    expect(PageQuery.safeParse({}).success).toBe(true);
  });

  it("acepta un cursor de 64 caracteres (límite)", () => {
    expect(PageQuery.safeParse({ cursor: "a".repeat(64) }).success).toBe(true);
  });

  it.each([
    ["vacío", ""],
    ["65 caracteres (límite + 1)", "a".repeat(65)],
    ["un símbolo $", "id$raro"],
    ["una barra", "a/b"],
  ])("rechaza un cursor %s", (_caso, value) => {
    expect(PageQuery.safeParse({ cursor: value }).success).toBe(false);
  });
});
