import { z } from "zod";
import { Role, type SessionUser } from "../schema";
import { UnauthorizedError } from "./errors";

/** Nombre de la cookie de sesión (el mismo valor que `SESSION_COOKIE` del contrato de auth). */
export const SESSION_COOKIE_NAME = "sesion";

interface VerifiedToken {
  uid: string;
}

/** Puerto mínimo del Admin SDK para verificar identidad (`Auth` de firebase-admin lo cumple). */
export interface TokenVerifier {
  verifySessionCookie(cookie: string, checkRevoked?: boolean): Promise<VerifiedToken>;
  verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<VerifiedToken>;
}

const Claims = z.object({
  uid: z.string().min(1),
  email: z.string().optional(),
  rol: Role.optional().catch(undefined),
});

/** Lee una cookie de la cabecera `Cookie`. */
export function readCookie(header: string | null, name: string): string | null {
  if (header === null) {
    return null;
  }
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function bearerToken(header: string | null): string | null {
  if (header === null || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) {
    return null;
  }
  return token;
}

async function defaultVerifier(): Promise<TokenVerifier> {
  const { adminAuth } = await import("./firebase-admin");
  return adminAuth();
}

async function verify(request: Request, verifier: TokenVerifier): Promise<VerifiedToken> {
  const cookie = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (cookie !== null && cookie.length > 0) {
    return verifier.verifySessionCookie(cookie, true);
  }
  const token = bearerToken(request.headers.get("authorization"));
  if (token !== null) {
    return verifier.verifyIdToken(token, true);
  }
  throw new UnauthorizedError();
}

function toUnauthorized<T>(error: T): Error {
  if (error instanceof UnauthorizedError) {
    return error;
  }
  return new UnauthorizedError("Sesión no válida");
}

/**
 * Usuario de la petición: cookie `sesion` (verifySessionCookie con revocación) o `Authorization: Bearer`
 * (verifyIdToken). El rol sale del claim `rol`; sin claim, `CREADOR`. Sin credenciales válidas → 401.
 */
export async function requerirUsuario(request: Request, verifier?: TokenVerifier): Promise<SessionUser> {
  let decoded: VerifiedToken;
  try {
    decoded = await verify(request, verifier ?? (await defaultVerifier()));
  } catch (error) {
    throw toUnauthorized(error);
  }
  const claims = Claims.parse(decoded);
  return { uid: claims.uid, correo: claims.email ?? "", rol: claims.rol ?? "CREADOR" };
}
