import type { AnswerValue, Field } from "@/features/forms/schema";
import type { ResponseItem, ResponseList } from "../schema";

export interface Column {
  id: string;
  etiqueta: string;
}

/** Columnas: los campos de la versión más reciente y, detrás, los que solo existían en versiones anteriores. */
export function buildColumns(versiones: ResponseList["versiones"]): Column[] {
  const sorted = [...versiones].sort((a, b) => b.version - a.version);
  const columns: Column[] = [];
  const seen = new Set<string>();
  for (const definition of sorted) {
    for (const field of definition.campos) {
      if (!seen.has(field.id)) {
        seen.add(field.id);
        columns.push({ id: field.id, etiqueta: field.etiqueta });
      }
    }
  }
  return columns;
}

export function mergeVersions(
  current: ResponseList["versiones"],
  incoming: ResponseList["versiones"],
): ResponseList["versiones"] {
  const byVersion = new Map<number, Field[]>();
  for (const definition of [...current, ...incoming]) {
    byVersion.set(definition.version, definition.campos);
  }
  return Array.from(byVersion, ([version, campos]) => ({ version, campos }));
}

/** Texto legible de un valor de respuesta. */
export function formatValue(value: AnswerValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** Escapa una celda CSV: evita inyección de fórmulas y encierra entre comillas si hace falta. */
export function csvCell(text: string): string {
  let safe = text;
  if (FORMULA_START.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildCsv(columns: Column[], items: ResponseItem[]): string {
  const header = ["id", "version", "respondido_en", ...columns.map((column) => column.etiqueta)];
  const rows = items.map((item) => [
    item.id,
    String(item.version),
    item.respondido_en,
    ...columns.map((column) => formatValue(item.valores[column.id])),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
