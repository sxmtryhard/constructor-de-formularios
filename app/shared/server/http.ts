import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { ErrorBody } from "../schema";
import {
  DomainError,
  ForbiddenError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./errors";
import { zodDetails } from "./validation";

export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const NO_STORE = "no-store";

/** Respuesta JSON; por defecto `Cache-Control: no-store` (rutas privadas). */
export function json<T>(body: T, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": NO_STORE, ...headers } });
}

/** Respuesta 204 sin cuerpo. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": NO_STORE } });
}

function toResponse<T>(error: T, requestId: string): NextResponse {
  if (error instanceof TooManyRequestsError) {
    const body: ErrorBody = { error: error.message };
    return json(body, 429, { "Retry-After": String(error.retryAfter) });
  }
  if (error instanceof DomainError) {
    const body: ErrorBody = { error: error.message };
    if (error.detalles !== undefined) {
      body.detalles = error.detalles;
    }
    return json(body, error.status);
  }
  if (error instanceof z.ZodError) {
    const body: ErrorBody = { error: "Datos no válidos", detalles: zodDetails(error) };
    return json(body, 400);
  }
  // Sin datos personales: solo el id de la petición y el tipo de error.
  let name = "Error";
  if (error instanceof Error) {
    name = error.name;
  }
  console.error(`[api] petición ${requestId}: error interno (${name})`);
  const body: ErrorBody = { error: "Error interno del servidor" };
  return json(body, 500, { "X-Request-Id": requestId });
}

/** Ejecuta un manejador de ruta y traduce los errores de dominio a `{ error, detalles? }`. */
export async function manejar(handler: () => Promise<Response>): Promise<Response> {
  const requestId = randomUUID();
  try {
    return await handler();
  } catch (error) {
    return handleError(error, requestId);
  }
}

function handleError<T>(error: T, requestId: string): NextResponse {
  unstable_rethrow(error);
  return toResponse(error, requestId);
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const JsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValue), z.record(z.string(), JsonValue)]),
);

function parseJsonText(text: string): Json {
  try {
    return JsonValue.parse(JSON.parse(text));
  } catch {
    throw new ValidationError("El cuerpo no es JSON válido");
  }
}

/**
 * Lee y valida un cuerpo JSON: exige `application/json` (415), un tamaño máximo (413)
 * y que cumpla el esquema (400 con detalles por campo, vía `manejar`).
 */
export async function leerJson<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<z.output<S>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new UnsupportedMediaTypeError();
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError();
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new PayloadTooLargeError();
  }
  return schema.parse(parseJsonText(text));
}

/** En métodos que modifican: la cabecera `Origin` debe coincidir con el host de la petición; si no, 403. */
export function exigirOrigen(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin === null || host === null) {
    throw new ForbiddenError("Origen no permitido");
  }
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ForbiddenError("Origen no permitido");
  }
  if (originHost !== host) {
    throw new ForbiddenError("Origen no permitido");
  }
}

/**
 * IP del cliente para el límite de frecuencia. Se prefieren las cabeceras que fija la plataforma
 * (Vercel: `x-vercel-forwarded-for`, `x-real-ip`); de `x-forwarded-for` se toma el ÚLTIMO salto,
 * el que agregó el proxy de confianza, porque el primero lo puede inventar el cliente.
 */
export function ipDe(request: Request): string {
  for (const header of ["x-vercel-forwarded-for", "x-real-ip"]) {
    const value = request.headers.get(header);
    if (value !== null && value.trim().length > 0) {
      return value.split(",")[0].trim();
    }
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null && forwarded.trim().length > 0) {
    const hops = forwarded.split(",");
    return hops[hops.length - 1].trim();
  }
  return "desconocida";
}

/** Parámetros de búsqueda como objeto plano, para validarlos con Zod. */
export function queryDe(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}
