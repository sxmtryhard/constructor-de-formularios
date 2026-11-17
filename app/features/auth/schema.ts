import { z } from "zod";

/** `POST /api/auth/sesion`: el ID token que da Firebase Auth tras iniciar sesión (§9.1). */
export const CreateSessionInput = z.strictObject({
  id_token: z.string().min(1).max(4096),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInput>;

/** Duración de la cookie de sesión: 5 días (§9.1). */
export const SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

/** Inicio de sesión "reciente" exigido para crear la cookie (§9.1). */
export const RECENT_SIGN_IN_SECONDS = 5 * 60;

export const SESSION_COOKIE = "sesion";
