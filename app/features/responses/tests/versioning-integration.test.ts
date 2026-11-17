import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as submitResponse } from "@/api/f/[codigo]/respuestas/route";
import { GET as getForm, PUT as updateForm } from "@/api/formularios/[id]/route";
import { POST as publishForm } from "@/api/formularios/[id]/publicar/route";
import { GET as listResponses } from "@/api/formularios/[id]/respuestas/route";
import { POST as createForm } from "@/api/formularios/route";
import { Form } from "@/features/forms/schema";
import { ResponseList, SubmitResult } from "@/features/responses/schema";
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

const AUTHOR = "docente1";
const ORIGINAL_FIELDS = [makeField("nombre", { etiqueta: "Nombre", obligatorio: true })];
const CHANGED_FIELDS = [makeField("nombre", { etiqueta: "Nombre completo", obligatorio: true })];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T10:00:00.000Z"));
  resetHarness();
});

afterEach(() => {
  vi.useRealTimers();
});

async function createAndPublish(): Promise<{ id: string; code: string }> {
  const created = await createForm(
    apiRequest("/api/formularios", {
      method: "POST",
      uid: AUTHOR,
      body: { titulo: "Inscripción al club", descripcion: "", campos: ORIGINAL_FIELDS },
    }),
  );
  expect(created.status).toBe(201);
  const form = Form.parse(await created.json());
  expect(form.version).toBe(1);
  const published = await publishForm(
    apiRequest(`/api/formularios/${form.id}/publicar`, { method: "POST", uid: AUTHOR, body: { cierra: null } }),
    params({ id: form.id }),
  );
  expect(published.status).toBe(200);
  const code = Form.parse(await published.json()).codigo;
  if (code === null) {
    throw new Error("Publicar debe asignar un código");
  }
  return { id: form.id, code };
}

function submit(code: string, valores: Record<string, string>) {
  return submitResponse(
    apiRequest(`/api/f/${code}/respuestas`, { method: "POST", body: { valores } }),
    params({ codigo: code }),
  );
}

describe("Integración ruta → servicio → repositorio: versionado de respuestas", () => {
  it("cambiar un campo con respuestas sube la versión y la respuesta anterior conserva su definición", async () => {
    const { id, code } = await createAndPublish();

    const first = await submit(code, { nombre: "Ana" });
    expect(first.status).toBe(201);
    expect(SubmitResult.parse(await first.json()).version).toBe(1);

    vi.setSystemTime(new Date("2026-11-16T11:00:00.000Z"));
    const updated = await updateForm(
      apiRequest(`/api/formularios/${id}`, {
        method: "PUT",
        uid: AUTHOR,
        body: { titulo: "Inscripción al club", descripcion: "", campos: CHANGED_FIELDS },
      }),
      params({ id }),
    );
    expect(updated.status).toBe(200);
    expect(Form.parse(await updated.json()).version).toBe(2);

    const reread = await getForm(apiRequest(`/api/formularios/${id}`, { uid: AUTHOR }), params({ id }));
    const current = Form.parse(await reread.json());
    expect(current.version).toBe(2);
    expect(current.total_respuestas).toBe(1);

    const second = await submit(code, { nombre: "Beto" });
    expect(second.status).toBe(201);
    expect(SubmitResult.parse(await second.json()).version).toBe(2);

    const listed = await listResponses(
      apiRequest(`/api/formularios/${id}/respuestas`, { uid: AUTHOR }),
      params({ id }),
    );
    expect(listed.status).toBe(200);
    const list = ResponseList.parse(await listed.json());
    const ana = list.items.find((item) => item.valores.nombre === "Ana");
    expect(ana?.version).toBe(1);
    const versionOne = list.versiones.find((entry) => entry.version === 1);
    expect(versionOne?.campos).toEqual(ORIGINAL_FIELDS);
    const versionTwo = list.versiones.find((entry) => entry.version === 2);
    expect(versionTwo?.campos).toEqual(CHANGED_FIELDS);
  });

  it("guardar sin cambiar los campos no sube la versión", async () => {
    const { id, code } = await createAndPublish();
    expect((await submit(code, { nombre: "Ana" })).status).toBe(201);
    const updated = await updateForm(
      apiRequest(`/api/formularios/${id}`, {
        method: "PUT",
        uid: AUTHOR,
        body: { titulo: "Otro título", descripcion: "", campos: ORIGINAL_FIELDS },
      }),
      params({ id }),
    );
    expect(Form.parse(await updated.json()).version).toBe(1);
  });

  it("un obligatorio vacío da 400 con detalles para ese campo aunque el cliente no valide", async () => {
    const { code } = await createAndPublish();
    const cases: Record<string, string>[] = [{ nombre: "" }, {}];
    for (const valores of cases) {
      const response = await submit(code, valores);
      expect(response.status).toBe(400);
      const body = ErrorBody.parse(await response.json());
      expect(body.detalles?.some((detail) => detail.campo.endsWith("nombre"))).toBe(true);
    }
  });
});
