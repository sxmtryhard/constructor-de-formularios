import { z } from "zod";

/** Roles (custom claim `rol`, enunciado §9.1). Sin claim, la cuenta es `CREADOR`. */
export const Role = z.enum(["CREADOR", "ADMINISTRADOR"]);
export type Role = z.infer<typeof Role>;

/** Usuario de la sesión verificada (`GET /api/auth/yo`). */
export const SessionUser = z.strictObject({
  uid: z.string().min(1),
  correo: z.string(),
  rol: Role,
});
export type SessionUser = z.infer<typeof SessionUser>;

export const MeResponse = z.strictObject({ usuario: SessionUser });
export type MeResponse = z.infer<typeof MeResponse>;

/** Detalle de un error de validación, por campo (§9.2). */
export const ErrorDetail = z.strictObject({ campo: z.string(), mensaje: z.string() });
export type ErrorDetail = z.infer<typeof ErrorDetail>;

/** Cuerpo de todo error de la API (§9.2). */
export const ErrorBody = z.strictObject({
  error: z.string(),
  detalles: z.array(ErrorDetail).optional(),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

/** Parámetros de paginación con cursor (§9.2): `?limite=20&cursor=<id>`, límite máximo 100. */
export const PageQuery = z.strictObject({
  limite: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});
export type PageQuery = z.infer<typeof PageQuery>;
