import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ErrorBody } from "@/shared/schema";
import { DomainError } from "@/shared/server/errors";
import { manejar } from "@/shared/server/http";
import { parseStored } from "@/shared/server/validation";

const StoredForm = z.strictObject({ titulo: z.string(), total: z.number().int().min(0) });

function captureError(action: () => void): Error {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error("Se lanzó algo que no es un Error");
  }
  throw new Error("Se esperaba que lanzara");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseStored: validar un documento leído de la base", () => {
  it("devuelve el dato cuando cumple el esquema", () => {
    expect(parseStored(StoredForm, { titulo: "Encuesta", total: 3 })).toEqual({ titulo: "Encuesta", total: 3 });
  });

  it("con un documento corrupto lanza un Error que no es ZodError ni error de dominio", () => {
    const error = captureError(() => parseStored(StoredForm, { titulo: 42, total: -1 }));
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(z.ZodError);
    expect(error).not.toBeInstanceOf(DomainError);
  });

  it("con un documento con claves de más también lo trata como corrupto", () => {
    const error = captureError(() => parseStored(StoredForm, { titulo: "x", total: 1, intruso: true }));
    expect(error).not.toBeInstanceOf(z.ZodError);
    expect(error).not.toBeInstanceOf(DomainError);
  });
});

describe("Un documento corrupto leído responde 500 sin detalles", () => {
  it("manejar traduce el error de parseStored a 500 genérico, sin detalles ni datos del documento", async () => {
    const response = await manejar(async () => {
      parseStored(StoredForm, { titulo: "secreto-del-documento", total: "no-numero" });
      return new Response(null, { status: 204 });
    });
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secreto-del-documento");
    expect(text).not.toContain("total");
    const body = ErrorBody.parse(JSON.parse(text));
    expect(body.detalles).toBeUndefined();
    expect(response.headers.get("X-Request-Id")).not.toBeNull();
  });

  it("en cambio, un ZodError de datos del cliente sigue siendo 400 con detalles", async () => {
    const response = await manejar(async () => {
      StoredForm.parse({ titulo: 1, total: 0 });
      return new Response(null, { status: 204 });
    });
    expect(response.status).toBe(400);
    const body = ErrorBody.parse(await response.json());
    expect(body.detalles?.length ?? 0).toBeGreaterThan(0);
  });
});
