import type { z } from "zod";
import type { ErrorDetail } from "../schema";

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
