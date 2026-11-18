import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as submitResponse } from "@/api/f/[codigo]/respuestas/route";
import { POST as publishForm } from "@/api/formularios/[id]/publicar/route";
import { POST as createForm } from "@/api/formularios/route";
import { Form } from "@/features/forms/schema";
import { ErrorBody } from "@/shared/schema";
import { apiRequest, params, resetHarness } from "@/tests/helpers/api";
import { makeField } from "@/tests/helpers/factories";

vi.mock("server-only", () => ({}));
vi.mock("@/features/container", async () => {
  const harness = await import("@/tests/helpers/api");
  return {
    getFormsService: () => harness.currentHarness().forms,
    getResponsesService: () => harness.currentHarness().responses,
    getRateLimiters: () => harness.currentHarness().limiters,
  };
});
vi.mock("@/shared/server/session", async () => {
  const actual = await vi.importActual<typeof import("@/shared/server/session")>("@/shared/server/session");
  const harness = await import("@/tests/helpers/api");
  return {
    ...actual,
    requerirUsuario: (request: Request) => actual.requerirUsuario(request, harness.fakeVerifier),
  };
});

const NOW = new Date("2026-11-16T10:00:00.000Z");
const AUTHOR = "docente1";
const OTHER = "docente2";
const IP_A = "198.51.100.10";
const IP_B = "198.51.100.20";
const MAX_BODY_BYTES = 64 * 1024;
const SUBMIT_LIMIT = 20;
const WRITE_LIMIT = 60;

async function createValidForm(uid: string): Promise<Form> {
  const response = await createForm(
    apiRequest("/api/formularios", {
      method: "POST",
      uid,
      body: { titulo: "Encuesta", descripcion: "", campos: [makeField("nombre", { obligatorio: true })] },
    }),
  );
  expect(response.status).toBe(201);
  return Form.parse(await response.json());
}

async function publishedCode(uid: string): Promise<string> {
  const form = await createValidForm(uid);
  const response = await publishForm(
    apiRequest(`/api/formularios/${form.id}/publicar`, { method: "POST", uid, body: { cierra: null } }),
    params({ id: form.id }),
  );
  expect(response.status).toBe(200);
  const published = Form.parse(await response.json());
  if (published.codigo === null) {
    throw new Error("El formulario publicado debería tener código");
  }
  return published.codigo;
}

function submitFrom(code: string, ip: string): Promise<Response> {
  const request = apiRequest(`/api/f/${code}/respuestas`, { method: "POST", body: { valores: { nombre: "Ana" } } });
  request.headers.set("x-real-ip", ip);
  return submitResponse(request, params({ codigo: code }));
}

function submitRaw(code: string, rawBody: string, contentType: string): Promise<Response> {
  return submitResponse(
    apiRequest(`/api/f/${code}/respuestas`, { method: "POST", rawBody, contentType }),
    params({ codigo: code }),
  );
}

/** Cuerpo JSON válido en forma cuyo tamaño total en bytes es exactamente `bytes`. */
function jsonBodyOfSize(bytes: number): string {
  const prefix = '{"valores":{"nombre":"';
  const suffix = '"}}';
  return `${prefix}${"a".repeat(bytes - prefix.length - suffix.length)}${suffix}`;
}

function createFormAs(uid: string): Promise<Response> {
  return createForm(
    apiRequest("/api/formularios", {
      method: "POST",
      uid,
      body: { titulo: "Encuesta", descripcion: "", campos: [] },
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetHarness();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Tamaño máximo del cuerpo al enviar una respuesta (413)", () => {
  it("un cuerpo de más de 64 KB responde 413 con cuerpo de error", async () => {
    const code = await publishedCode(AUTHOR);
    const response = await submitRaw(code, jsonBodyOfSize(MAX_BODY_BYTES + 1024), "application/json");
    expect(response.status).toBe(413);
    expect(ErrorBody.safeParse(await response.json()).success).toBe(true);
  });

  it("un cuerpo de 64 KB + 1 byte responde 413", async () => {
    const code = await publishedCode(AUTHOR);
    const response = await submitRaw(code, jsonBodyOfSize(MAX_BODY_BYTES + 1), "application/json");
    expect(response.status).toBe(413);
  });

  it("un cuerpo de exactamente 64 KB no se rechaza por tamaño", async () => {
    const code = await publishedCode(AUTHOR);
    const response = await submitRaw(code, jsonBodyOfSize(MAX_BODY_BYTES), "application/json");
    expect(response.status).not.toBe(413);
  });
});

describe("Tipo de contenido al enviar una respuesta (415)", () => {
  it("con text/plain responde 415 con cuerpo de error", async () => {
    const code = await publishedCode(AUTHOR);
    const response = await submitRaw(code, '{"valores":{"nombre":"Ana"}}', "text/plain");
    expect(response.status).toBe(415);
    expect(ErrorBody.safeParse(await response.json()).success).toBe(true);
  });

  it("con un formulario codificado (application/x-www-form-urlencoded) responde 415", async () => {
    const code = await publishedCode(AUTHOR);
    const response = await submitRaw(code, "nombre=Ana", "application/x-www-form-urlencoded");
    expect(response.status).toBe(415);
  });

  it("sin cabecera Content-Type responde 415", async () => {
    const code = await publishedCode(AUTHOR);
    const request = apiRequest(`/api/f/${code}/respuestas`, {
      method: "POST",
      body: { valores: { nombre: "Ana" } },
    });
    request.headers.delete("content-type");
    const response = await submitResponse(request, params({ codigo: code }));
    expect(response.status).toBe(415);
  });

  it("con application/json; charset=utf-8 se acepta (201)", async () => {
    const code = await publishedCode(AUTHOR);
    const response = await submitRaw(code, '{"valores":{"nombre":"Ana"}}', "application/json; charset=utf-8");
    expect(response.status).toBe(201);
  });
});

describe("Límite de envíos de respuestas por IP (429)", () => {
  it("los primeros 20 envíos de la misma IP en un minuto se aceptan", async () => {
    const code = await publishedCode(AUTHOR);
    for (let attempt = 1; attempt <= SUBMIT_LIMIT; attempt += 1) {
      expect((await submitFrom(code, IP_A)).status).toBe(201);
    }
  });

  it("el envío 21 de la misma IP en un minuto responde 429 con Retry-After", async () => {
    const code = await publishedCode(AUTHOR);
    for (let attempt = 1; attempt <= SUBMIT_LIMIT; attempt += 1) {
      await submitFrom(code, IP_A);
    }
    const response = await submitFrom(code, IP_A);
    expect(response.status).toBe(429);
    const retryAfter = Number(response.headers.get("retry-after"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(ErrorBody.safeParse(await response.json()).success).toBe(true);
  });

  it("otra IP no queda bloqueada cuando la primera alcanzó el límite", async () => {
    const code = await publishedCode(AUTHOR);
    for (let attempt = 1; attempt <= SUBMIT_LIMIT + 1; attempt += 1) {
      await submitFrom(code, IP_A);
    }
    expect((await submitFrom(code, IP_A)).status).toBe(429);
    expect((await submitFrom(code, IP_B)).status).toBe(201);
  });

  it("pasado el minuto, la misma IP puede volver a enviar", async () => {
    const code = await publishedCode(AUTHOR);
    for (let attempt = 1; attempt <= SUBMIT_LIMIT + 1; attempt += 1) {
      await submitFrom(code, IP_A);
    }
    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    expect((await submitFrom(code, IP_A)).status).toBe(201);
  });
});

describe("Límite de escrituras por usuario en rutas privadas (429)", () => {
  it("la escritura 61 del mismo usuario en un minuto responde 429 con Retry-After", async () => {
    for (let attempt = 1; attempt <= WRITE_LIMIT; attempt += 1) {
      expect((await createFormAs(AUTHOR)).status).toBe(201);
    }
    const response = await createFormAs(AUTHOR);
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("otro usuario no queda bloqueado cuando el primero alcanzó el límite", async () => {
    for (let attempt = 1; attempt <= WRITE_LIMIT + 1; attempt += 1) {
      await createFormAs(AUTHOR);
    }
    expect((await createFormAs(AUTHOR)).status).toBe(429);
    expect((await createFormAs(OTHER)).status).toBe(201);
  });
});
