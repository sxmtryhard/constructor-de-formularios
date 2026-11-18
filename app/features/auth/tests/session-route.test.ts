import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as closeSession } from "@/api/auth/sesion/route";
import { ErrorBody } from "@/shared/schema";
import { apiRequest, ORIGIN, VALID_COOKIE_PREFIX } from "@/tests/helpers/api";

const revoked = vi.hoisted((): string[] => []);

vi.mock("server-only", () => ({}));
vi.mock("@/features/container", () => ({
  getSessionService: () => ({
    async createSession(): Promise<string> {
      throw new Error("no se usa en estas pruebas");
    },
    async revokeSession(cookie: string): Promise<void> {
      revoked.push(cookie);
    },
  }),
}));

const UID = "docente1";
const COOKIE = `${VALID_COOKIE_PREFIX}${UID}`;

/** La cookie se fija al construir la petición (`NextRequest.cookies` se lee en ese momento). */
function deleteRequest(origin: string | null, withSession: boolean) {
  if (withSession) {
    return apiRequest("/api/auth/sesion", { method: "DELETE", origin, uid: UID });
  }
  return apiRequest("/api/auth/sesion", { method: "DELETE", origin });
}

beforeEach(() => {
  revoked.length = 0;
});

describe("Cerrar sesión (DELETE /api/auth/sesion) exige Origin del mismo sitio", () => {
  it("sin cabecera Origin responde 403 y no revoca la sesión", async () => {
    const response = await closeSession(deleteRequest(null, true));
    expect(response.status).toBe(403);
    expect(ErrorBody.safeParse(await response.json()).success).toBe(true);
    expect(revoked).toEqual([]);
  });

  it("con Origin de otro sitio responde 403 y no revoca la sesión", async () => {
    const response = await closeSession(deleteRequest("https://atacante.example", true));
    expect(response.status).toBe(403);
    expect(revoked).toEqual([]);
  });

  it("con Origin correcto y sesión responde 204, revoca y borra la cookie", async () => {
    const response = await closeSession(deleteRequest(ORIGIN, true));
    expect(response.status).toBe(204);
    expect(revoked).toEqual([COOKIE]);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("sesion=");
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });

  it("con Origin correcto y sin sesión responde 204 sin revocar nada", async () => {
    const response = await closeSession(deleteRequest(ORIGIN, false));
    expect(response.status).toBe(204);
    expect(revoked).toEqual([]);
  });
});
