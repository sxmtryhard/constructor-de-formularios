import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS } from "@/features/auth/schema";
import type { AdminAuthPort } from "@/features/auth/server/repository";
import { createSessionService } from "@/features/auth/server/session-service";
import { UnauthorizedError } from "@/shared/server/errors";

const NOW = new Date("2026-11-16T10:00:00.000Z");
const NOW_SECONDS = NOW.getTime() / 1000;

interface FakeAuthCalls {
  createdWith: { expiresIn: number } | null;
  revoked: string[];
}

function fakeAuth(authTime: number, calls: FakeAuthCalls): AdminAuthPort {
  return {
    async verifyIdToken(idToken: string) {
      if (idToken !== "token-bueno") {
        throw new Error("token inválido");
      }
      return { uid: "docente1", auth_time: authTime };
    },
    async createSessionCookie(_idToken: string, options: { expiresIn: number }) {
      calls.createdWith = options;
      return "cookie-de-sesion";
    },
    async verifySessionCookie(cookie: string) {
      if (cookie !== "cookie-de-sesion") {
        throw new Error("cookie inválida");
      }
      return { uid: "docente1" };
    },
    async revokeRefreshTokens(uid: string) {
      calls.revoked.push(uid);
    },
  };
}

function newCalls(): FakeAuthCalls {
  return { createdWith: null, revoked: [] };
}

describe("Crear sesión a partir de un ID token", () => {
  it("con un inicio de sesión reciente (hace 1 minuto) devuelve la cookie de 5 días", async () => {
    const calls = newCalls();
    const service = createSessionService({ auth: fakeAuth(NOW_SECONDS - 60, calls) });
    await expect(service.createSession("token-bueno", NOW)).resolves.toBe("cookie-de-sesion");
    expect(calls.createdWith).toEqual({ expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
    expect(SESSION_MAX_AGE_SECONDS).toBe(5 * 24 * 60 * 60);
  });

  it("con un inicio de sesión de hace más de 5 minutos responde 401", async () => {
    const calls = newCalls();
    const service = createSessionService({ auth: fakeAuth(NOW_SECONDS - 5 * 60 - 1, calls) });
    const attempt = service.createSession("token-bueno", NOW);
    await expect(attempt).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(attempt).rejects.toMatchObject({ status: 401 });
    expect(calls.createdWith).toBeNull();
  });

  it("con un inicio de sesión de hace 10 minutos responde 401", async () => {
    const service = createSessionService({ auth: fakeAuth(NOW_SECONDS - 10 * 60, newCalls()) });
    await expect(service.createSession("token-bueno", NOW)).rejects.toMatchObject({ status: 401 });
  });

  it("con un token no válido responde 401", async () => {
    const service = createSessionService({ auth: fakeAuth(NOW_SECONDS, newCalls()) });
    await expect(service.createSession("token-falso", NOW)).rejects.toMatchObject({ status: 401 });
  });
});

describe("Cerrar sesión", () => {
  it("revoca los tokens del usuario de una cookie válida", async () => {
    const calls = newCalls();
    const service = createSessionService({ auth: fakeAuth(NOW_SECONDS, calls) });
    await service.revokeSession("cookie-de-sesion");
    expect(calls.revoked).toEqual(["docente1"]);
  });

  it("con una cookie no válida no falla ni revoca nada", async () => {
    const calls = newCalls();
    const service = createSessionService({ auth: fakeAuth(NOW_SECONDS, calls) });
    await expect(service.revokeSession("basura")).resolves.toBeUndefined();
    expect(calls.revoked).toEqual([]);
  });
});
