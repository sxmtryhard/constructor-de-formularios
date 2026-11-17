import type { z } from "zod";
import { ErrorBody } from "../schema";

/** Resultado de llamar a la API desde el navegador: datos validados o el error del contrato. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ErrorBody };

const NETWORK_ERROR: ErrorBody = {
  error: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
};

const STATUS_MESSAGES: Partial<Record<number, string>> = {
  401: "Tu sesión no es válida o expiró. Vuelve a ingresar.",
  403: "No tienes permiso para hacer esto.",
  404: "No se encontró lo que buscas.",
  410: "Este formulario ya está cerrado.",
  413: "La respuesta es demasiado grande.",
  429: "Demasiadas peticiones. Espera un momento y vuelve a intentarlo.",
};

function fallbackError(status: number): ErrorBody {
  return { error: STATUS_MESSAGES[status] ?? `Error inesperado del servidor (${status}).` };
}

/** Lee el cuerpo de error `{ error, detalles? }` validándolo en el mismo punto. */
async function readError(res: Response): Promise<ErrorBody> {
  try {
    const parsed = ErrorBody.safeParse(await res.json());
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    return fallbackError(res.status);
  }
  return fallbackError(res.status);
}

function buildInit(method: string, body: object | undefined): RequestInit {
  const init: RequestInit = { method, credentials: "same-origin", headers: { Accept: "application/json" } };
  if (body !== undefined) {
    init.headers = { Accept: "application/json", "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return init;
}

/** Petición con respuesta JSON, validada con el esquema del contrato. */
export async function apiJson<T>(
  url: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: object,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, buildInit(method, body));
    if (!res.ok) {
      return { ok: false, status: res.status, error: await readError(res) };
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      return { ok: false, status: 0, error: { error: "La respuesta del servidor no tiene el formato esperado." } };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
}

/** Petición sin cuerpo de respuesta (204). */
export async function apiEmpty(url: string, method: string, body?: object): Promise<ApiResult<null>> {
  try {
    const res = await fetch(url, buildInit(method, body));
    if (!res.ok) {
      return { ok: false, status: res.status, error: await readError(res) };
    }
    return { ok: true, data: null };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
}

/** Ruta de login que vuelve a la página actual después de ingresar. */
export function loginUrl(next: string): string {
  return `/login?siguiente=${encodeURIComponent(next)}`;
}
