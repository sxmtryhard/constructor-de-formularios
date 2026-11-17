import { UnauthorizedError } from "@/shared/server/errors";
import { RECENT_SIGN_IN_SECONDS, SESSION_MAX_AGE_SECONDS } from "../schema";
import type { AdminAuthPort } from "./repository";

export interface SessionService {
  /** Cambia un ID token reciente (≤ 5 min desde el inicio de sesión) por una cookie de sesión. */
  createSession(idToken: string, now: Date): Promise<string>;
  /** Revoca los refresh tokens del usuario de la cookie; si la cookie no es válida, no hace nada. */
  revokeSession(cookie: string): Promise<void>;
}

async function verifyOrFail(auth: AdminAuthPort, idToken: string): Promise<{ uid: string; auth_time: number }> {
  try {
    return await auth.verifyIdToken(idToken, true);
  } catch {
    throw new UnauthorizedError("Token no válido");
  }
}

export function createSessionService(deps: { auth: AdminAuthPort }): SessionService {
  return {
    async createSession(idToken: string, now: Date): Promise<string> {
      const decoded = await verifyOrFail(deps.auth, idToken);
      const elapsed = now.getTime() / 1000 - decoded.auth_time;
      if (elapsed > RECENT_SIGN_IN_SECONDS) {
        throw new UnauthorizedError("Inicio de sesión no reciente; vuelve a ingresar");
      }
      try {
        return await deps.auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
      } catch {
        throw new UnauthorizedError("No se pudo crear la sesión");
      }
    },

    async revokeSession(cookie: string): Promise<void> {
      try {
        const decoded = await deps.auth.verifySessionCookie(cookie, false);
        await deps.auth.revokeRefreshTokens(decoded.uid);
      } catch {
        // Cookie vencida o inválida: no hay nada que revocar.
      }
    },
  };
}
