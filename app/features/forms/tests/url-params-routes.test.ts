import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPublicForm } from "@/api/f/[codigo]/route";
import { POST as submitResponse } from "@/api/f/[codigo]/respuestas/route";
import { POST as unpublishForm } from "@/api/formularios/[id]/despublicar/route";
import { POST as publishForm } from "@/api/formularios/[id]/publicar/route";
import { GET as listResponses } from "@/api/formularios/[id]/respuestas/route";
import { GET as getSummary } from "@/api/formularios/[id]/resumen/route";
import { DELETE as deleteForm, GET as getForm, PUT as updateForm } from "@/api/formularios/[id]/route";
import { GET as listForms, POST as createForm } from "@/api/formularios/route";
import { Form } from "@/features/forms/schema";
import { ResponseList } from "@/features/responses/schema";
import { ErrorBody } from "@/shared/schema";
import { apiRequest, currentHarness, params, resetHarness } from "@/tests/helpers/api";
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

const NOW = new Date("2026-11-17T10:00:00.000Z");
const AUTHOR = "docente1";
const INEXISTENT_ID = "no-existe-123";
const MALFORMED_IDS = ["x".repeat(65), "id$raro", "con espacio"];
const MALFORMED_CODES = ["MAYUS", "con-guion"];

async function createValidForm(uid: string): Promise<Form> {
  const response = await createForm(
    apiRequest("/api/formularios", {
      method: "POST",
      uid,
      body: { titulo: "Encuesta", descripcion: "", campos: [makeField("nombre")] },
    }),
  );
  expect(response.status).toBe(201);
  return Form.parse(await response.json());
}

async function publish(uid: string, id: string): Promise<string> {
  const response = await publishForm(
    apiRequest(`/api/formularios/${id}/publicar`, { method: "POST", uid, body: { cierra: null } }),
    params({ id }),
  );
  expect(response.status).toBe(200);
  const codigo = Form.parse(await response.json()).codigo;
  if (codigo === null) {
    throw new Error("El formulario publicado debería tener código");
  }
  return codigo;
}

async function submit(codigo: string, nombre: string): Promise<number> {
  const response = await submitResponse(
    apiRequest(`/api/f/${codigo}/respuestas`, { method: "POST", body: { valores: { nombre } } }),
    params({ codigo }),
  );
  return response.status;
}

interface RouteCase {
  nombre: string;
  call: (value: string) => Promise<Response>;
}

function getOwnForm(id: string): Promise<Response> {
  return getForm(apiRequest(`/api/formularios/${id}`, { uid: AUTHOR }), params({ id }));
}

function deleteOwnForm(id: string): Promise<Response> {
  return deleteForm(apiRequest(`/api/formularios/${id}`, { method: "DELETE", uid: AUTHOR }), params({ id }));
}

function listOwnResponses(id: string): Promise<Response> {
  return listResponses(apiRequest(`/api/formularios/${id}/respuestas`, { uid: AUTHOR }), params({ id }));
}

function getPublic(codigo: string): Promise<Response> {
  return getPublicForm(apiRequest(`/api/f/${codigo}`), params({ codigo }));
}

const ID_ROUTES: RouteCase[] = [
  { nombre: "GET /api/formularios/:id", call: getOwnForm },
  {
    nombre: "PUT /api/formularios/:id",
    call: (id) =>
      updateForm(
        apiRequest(`/api/formularios/${id}`, {
          method: "PUT",
          uid: AUTHOR,
          body: { titulo: "Nuevo", descripcion: "", campos: [makeField("nombre")] },
        }),
        params({ id }),
      ),
  },
  { nombre: "DELETE /api/formularios/:id", call: deleteOwnForm },
  {
    nombre: "POST /api/formularios/:id/publicar",
    call: (id) =>
      publishForm(
        apiRequest(`/api/formularios/${id}/publicar`, { method: "POST", uid: AUTHOR, body: { cierra: null } }),
        params({ id }),
      ),
  },
  {
    nombre: "POST /api/formularios/:id/despublicar",
    call: (id) =>
      unpublishForm(apiRequest(`/api/formularios/${id}/despublicar`, { method: "POST", uid: AUTHOR }), params({ id })),
  },
  { nombre: "GET /api/formularios/:id/respuestas", call: listOwnResponses },
  {
    nombre: "GET /api/formularios/:id/resumen",
    call: (id) => getSummary(apiRequest(`/api/formularios/${id}/resumen`, { uid: AUTHOR }), params({ id })),
  },
];

const CODE_ROUTES: RouteCase[] = [
  { nombre: "GET /api/f/:codigo", call: getPublic },
  {
    nombre: "POST /api/f/:codigo/respuestas",
    call: (codigo) =>
      submitResponse(
        apiRequest(`/api/f/${codigo}/respuestas`, { method: "POST", body: { valores: { nombre: "Ana" } } }),
        params({ codigo }),
      ),
  },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetHarness();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Un :id con forma no válida se trata como un formulario inexistente", () => {
  for (const { nombre: name, call } of ID_ROUTES) {
    for (const badId of MALFORMED_IDS) {
      it(`${name} con id «${badId.slice(0, 12)}…» (${badId.length} caracteres) responde 404 como un inexistente`, async () => {
        const inexistent = await call(INEXISTENT_ID);
        expect(inexistent.status).toBe(404);
        const expected = ErrorBody.parse(await inexistent.json());

        const response = await call(badId);
        expect(response.status).toBe(404);
        const body = ErrorBody.parse(await response.json());
        expect(body.error).toBe(expected.error);
        expect(body.detalles).toBeUndefined();
      });
    }
  }

  it("un id de 64 caracteres con forma válida pero inexistente también responde 404", async () => {
    const response = await getOwnForm("a".repeat(64));
    expect(response.status).toBe(404);
  });

  it("un id bien formado de un formulario propio sigue funcionando (200)", async () => {
    const form = await createValidForm(AUTHOR);
    const response = await getOwnForm(form.id);
    expect(response.status).toBe(200);
  });
});

describe("Un :codigo con forma no válida se trata como un enlace inexistente", () => {
  for (const { nombre: name, call } of CODE_ROUTES) {
    for (const badCode of MALFORMED_CODES) {
      it(`${name} con código «${badCode}» responde 404 como un inexistente`, async () => {
        const inexistent = await call("noexiste1");
        expect(inexistent.status).toBe(404);
        const expected = ErrorBody.parse(await inexistent.json());

        const response = await call(badCode);
        expect(response.status).toBe(404);
        const body = ErrorBody.parse(await response.json());
        expect(body.error).toBe(expected.error);
      });
    }
  }

  it("un código en mayúsculas de un formulario publicado no lo encuentra (404), en minúsculas sí (200)", async () => {
    const form = await createValidForm(AUTHOR);
    const codigo = await publish(AUTHOR, form.id);
    expect((await getPublic(codigo.toUpperCase())).status).toBe(404);
    expect((await getPublic(codigo)).status).toBe(200);
  });
});

describe("Cursor de paginación al listar formularios", () => {
  for (const cursor of ["id$raro", "x".repeat(65), "con%20espacio"]) {
    it(`un cursor con forma no válida («${cursor.slice(0, 12)}») responde 400`, async () => {
      const response = await listForms(apiRequest(`/api/formularios?cursor=${cursor}`, { uid: AUTHOR }));
      expect(response.status).toBe(400);
      expect(ErrorBody.safeParse(await response.json()).success).toBe(true);
    });
  }

  it("un cursor con forma válida (64 caracteres) no es un error de validación", async () => {
    const response = await listForms(apiRequest(`/api/formularios?cursor=${"a".repeat(64)}`, { uid: AUTHOR }));
    expect(response.status).not.toBe(400);
  });
});

describe("Borrar un formulario con respuestas", () => {
  async function deleteOwn(id: string): Promise<void> {
    const response = await deleteOwnForm(id);
    expect(response.status).toBe(204);
  }

  it("el repositorio en memoria ya no conserva las respuestas del formulario borrado", async () => {
    const form = await createValidForm(AUTHOR);
    const codigo = await publish(AUTHOR, form.id);
    expect(await submit(codigo, "Ana")).toBe(201);
    expect(await submit(codigo, "Luis")).toBe(201);
    expect(await currentHarness().repos.responses.listAll(form.id, 100)).toHaveLength(2);

    await deleteOwn(form.id);

    expect(await currentHarness().repos.responses.listAll(form.id, 100)).toHaveLength(0);
    expect((await listOwnResponses(form.id)).status).toBe(404);
  });

  it("un formulario nuevo creado después no hereda respuestas del borrado", async () => {
    const old = await createValidForm(AUTHOR);
    const oldCode = await publish(AUTHOR, old.id);
    expect(await submit(oldCode, "Ana")).toBe(201);
    await deleteOwn(old.id);

    const fresh = await createValidForm(AUTHOR);
    const freshCode = await publish(AUTHOR, fresh.id);
    expect(fresh.total_respuestas).toBe(0);
    expect(await submit(freshCode, "Eva")).toBe(201);

    const response = await listOwnResponses(fresh.id);
    expect(response.status).toBe(200);
    const list = ResponseList.parse(await response.json());
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.valores).toEqual({ nombre: "Eva" });
  });

  it("el enlace público del formulario borrado deja de funcionar (404)", async () => {
    const form = await createValidForm(AUTHOR);
    const codigo = await publish(AUTHOR, form.id);
    await deleteOwn(form.id);
    expect((await getPublic(codigo)).status).toBe(404);
  });
});
