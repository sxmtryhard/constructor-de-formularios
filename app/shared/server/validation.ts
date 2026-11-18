import type { z } from "zod";
import type { ErrorDetail } from "../schema";
import { CorruptDataError, NotFoundError } from "./errors";

/**
 * Valida un dato LEÍDO de la base. Si no cumple el esquema es un fallo interno (`CorruptDataError` → 500
 * genérico vía `manejar`), no un error del cliente: un `ZodError` aquí saldría como 400 con detalles internos.
 */
export function parseStored<S extends z.ZodType, T>(schema: S, stored: T): z.output<S> {
  const result = schema.safeParse(stored);
  if (!result.success) {
    throw new CorruptDataError();
  }
  return result.data;
}

/**
 * Valida un parámetro de la URL (`[id]`, `[codigo]`). Un valor con otra forma no puede existir en la base,
 * así que responde 404 con el mismo mensaje que un recurso inexistente (no 400) y sin consultar la base.
 */
export function paramValido<S extends z.ZodType<string>>(value: string, schema: S, notFoundMessage: string): string {
  if (!schema.safeParse(value).success) {
    throw new NotFoundError(notFoundMessage);
  }
  return value;
}

/** Convierte los issues de Zod en detalles por campo (`campo` = ruta con puntos; claves sobrantes una por una). */
export function zodDetails(error: z.ZodError): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  for (const issue of error.issues) {
    const base = issue.path.map((part) => String(part)).join(".");
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        const campo = [base, key].filter((part) => part.length > 0).join(".");
        details.push({ campo, mensaje: "Campo no definido" });
      }
      continue;
    }
    details.push({ campo: base, mensaje: issue.message });
  }
  return details;
}
