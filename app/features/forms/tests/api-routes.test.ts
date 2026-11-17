import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPublicForm } from "@/api/f/[codigo]/route";
import { POST as submitResponse } from "@/api/f/[codigo]/respuestas/route";
import { GET as getForm, PUT as updateForm } from "@/api/formularios/[id]/route";
import { POST as publishForm } from "@/api/formularios/[id]/publicar/route";
import { GET as listForms, POST as createForm } from "@/api/formularios/route";
import { Form, FormList } from "@/features/forms/schema";
import { SubmitResult } from "@/features/responses/schema";
import { ErrorBody } from "@/shared/schema";
import { apiRequest, params, resetHarness } from "@/tests/helpers/api";
import { makeField, makeFields } from "@/tests/helpers/factories";

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

async function publish(uid: string, id: string, cierra: string | null): Promise<Form> {
  const response = await publishForm(
    apiRequest(`/api/formularios/${id}/publicar`, { method: "POST", uid, body: { cierra } }),
    params({ id }),
  );
  expect(response.status).toBe(200);
  return Form.parse(await response.json());
}

function codeOf(form: Form): string {
  if (form.codigo === null) {
    throw new Error("El formulario publicado debería tener código");
  }
  return form.codigo;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetHarness();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Autenticación de rutas privadas", () => {
  it("sin sesión, listar formularios responde 401", async () => {
    const response = await listForms(apiRequest("/api/formularios"));
    expect(response.status).toBe(401);
    expect(ErrorBody.safeParse(await response.json()).success).toBe(true);
  });

  it("con una cookie de sesión no válida responde 401", async () => {
    const request = apiRequest("/api/formularios");
    request.headers.set("cookie", "sesion=falsificada");
    const response = await listForms(request);
    expect(response.status).toBe(401);
  });

  it("con sesión, el creador solo ve sus propios formularios", async () => {
    await createValidForm(AUTHOR);
    await createValidForm(OTHER);
    const response = await listForms(apiRequest("/api/formularios", { uid: AUTHOR }));
    expect(response.status).toBe(200);
    const list = FormList.parse(await response.json());
    expect(list.items).toHaveLength(1);
  });
});

describe("Validación del cuerpo al crear un formulario", () => {
  async function postForm(body: Parameters<typeof apiRequest>[1]) {
    const response = await createForm(apiRequest("/api/formularios", { method: "POST", uid: AUTHOR, ...body }));
    return { status: response.status, body: ErrorBody.parse(await response.json()) };
  }

  it("con 30 campos (el límite) se crea", async () => {
    const response = await createForm(
      apiRequest("/api/formularios", {
        method: "POST",
        uid: AUTHOR,
        body: { titulo: "Límite", descripcion: "", campos: makeFields(30) },
      }),
    );
    expect(response.status).toBe(201);
  });

  it("con 31 campos responde 400 con detalles", async () => {
    const result = await postForm({ body: { titulo: "Demasiados", descripcion: "", campos: makeFields(31) } });
    expect(result.status).toBe(400);
    expect(result.body.detalles?.length ?? 0).toBeGreaterThan(0);
  });

  it("con un patrón peligroso (a+)+ responde 400 con detalles", async () => {
    const campos = [makeField("c1", { reglas: { patron: "(a+)+" } })];
    const result = await postForm({ body: { titulo: "ReDoS", descripcion: "", campos } });
    expect(result.status).toBe(400);
    expect(result.body.detalles?.length ?? 0).toBeGreaterThan(0);
  });

  it("con una clave que no está en el contrato responde 400 y la nombra en detalles", async () => {
    const result = await postForm({ body: { titulo: "Extra", descripcion: "", campos: [], autorUid: "intruso" } });
    expect(result.status).toBe(400);
    expect(result.body.detalles?.map((detail) => detail.campo)).toContain("autorUid");
  });

  it("con content-type que no es JSON responde 415", async () => {
    const response = await createForm(
      apiRequest("/api/formularios", { method: "POST", uid: AUTHOR, rawBody: "hola", contentType: "text/plain" }),
    );
    expect(response.status).toBe(415);
  });
});

describe("Comprobación de Origin en métodos que modifican", () => {
  it("un POST con Origin de otro sitio responde 403", async () => {
    const response = await createForm(
      apiRequest("/api/formularios", {
        method: "POST",
        uid: AUTHOR,
        origin: "https://atacante.example",
        body: { titulo: "X", descripcion: "", campos: [] },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("un POST sin cabecera Origin responde 403", async () => {
    const response = await createForm(
      apiRequest("/api/formularios", {
        method: "POST",
        uid: AUTHOR,
        origin: null,
        body: { titulo: "X", descripcion: "", campos: [] },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("enviar una respuesta pública con Origin de otro sitio responde 403", async () => {
    const form = await createValidForm(AUTHOR);
    const code = codeOf(await publish(AUTHOR, form.id, null));
    const response = await submitResponse(
      apiRequest(`/api/f/${code}/respuestas`, {
        method: "POST",
        origin: "https://atacante.example",
        body: { valores: { nombre: "Ana" } },
      }),
      params({ codigo: code }),
    );
    expect(response.status).toBe(403);
  });
});

describe("Autorización por propietario", () => {
  it("el autor puede leer su formulario", async () => {
    const form = await createValidForm(AUTHOR);
    const response = await getForm(apiRequest(`/api/formularios/${form.id}`, { uid: AUTHOR }), params({ id: form.id }));
    expect(response.status).toBe(200);
  });

  it("leer el formulario de otro usuario responde 404", async () => {
    const form = await createValidForm(AUTHOR);
    const response = await getForm(apiRequest(`/api/formularios/${form.id}`, { uid: OTHER }), params({ id: form.id }));
    expect(response.status).toBe(404);
  });

  it("editar el formulario de otro usuario responde 404", async () => {
    const form = await createValidForm(AUTHOR);
    const response = await updateForm(
      apiRequest(`/api/formularios/${form.id}`, {
        method: "PUT",
        uid: OTHER,
        body: { titulo: "Robado", descripcion: "", campos: [] },
      }),
      params({ id: form.id }),
    );
    expect(response.status).toBe(404);
  });

  it("un formulario inexistente responde 404", async () => {
    const response = await getForm(
      apiRequest("/api/formularios/no-existe", { uid: AUTHOR }),
      params({ id: "no-existe" }),
    );
    expect(response.status).toBe(404);
  });
});

describe("Envío público de respuestas", () => {
  it("una respuesta válida se guarda con 201 y la versión 1", async () => {
    const form = await createValidForm(AUTHOR);
    const code = codeOf(await publish(AUTHOR, form.id, null));
    const response = await submitResponse(
      apiRequest(`/api/f/${code}/respuestas`, { method: "POST", body: { valores: { nombre: "Ana" } } }),
      params({ codigo: code }),
    );
    expect(response.status).toBe(201);
    expect(SubmitResult.parse(await response.json()).version).toBe(1);
  });

  it("con un campo no definido en el formulario responde 400 con detalles", async () => {
    const form = await createValidForm(AUTHOR);
    const code = codeOf(await publish(AUTHOR, form.id, null));
    const response = await submitResponse(
      apiRequest(`/api/f/${code}/respuestas`, { method: "POST", body: { valores: { nombre: "Ana", extra: "x" } } }),
      params({ codigo: code }),
    );
    expect(response.status).toBe(400);
    const body = ErrorBody.parse(await response.json());
    expect(body.detalles?.some((detail) => detail.campo.includes("extra"))).toBe(true);
  });

  it("con una clave extra en el cuerpo (fuera de valores) responde 400", async () => {
    const form = await createValidForm(AUTHOR);
    const code = codeOf(await publish(AUTHOR, form.id, null));
    const response = await submitResponse(
      apiRequest(`/api/f/${code}/respuestas`, { method: "POST", body: { valores: { nombre: "Ana" }, uid: "x" } }),
      params({ codigo: code }),
    );
    expect(response.status).toBe(400);
  });

  it("con content-type que no es JSON responde 415", async () => {
    const form = await createValidForm(AUTHOR);
    const code = codeOf(await publish(AUTHOR, form.id, null));
    const response = await submitResponse(
      apiRequest(`/api/f/${code}/respuestas`, { method: "POST", rawBody: "nombre=Ana", contentType: "text/plain" }),
      params({ codigo: code }),
    );
    expect(response.status).toBe(415);
  });

  it("a un código inexistente responde 404", async () => {
    const response = await submitResponse(
      apiRequest("/api/f/nadie/respuestas", { method: "POST", body: { valores: {} } }),
      params({ codigo: "nadie" }),
    );
    expect(response.status).toBe(404);
  });

  it("antes de la fecha de cierre se acepta y después responde 410", async () => {
    const form = await createValidForm(AUTHOR);
    const code = codeOf(await publish(AUTHOR, form.id, "2026-11-17T00:00:00.000Z"));
    const send = () =>
      submitResponse(
        apiRequest(`/api/f/${code}/respuestas`, { method: "POST", body: { valores: { nombre: "Ana" } } }),
        params({ codigo: code }),
      );
    expect((await send()).status).toBe(201);
    vi.setSystemTime(new Date("2026-11-17T00:00:01.000Z"));
    expect((await send()).status).toBe(410);
    const publicResponse = await getPublicForm(apiRequest(`/api/f/${code}`), params({ codigo: code }));
    expect(publicResponse.status).toBe(410);
  });
});
