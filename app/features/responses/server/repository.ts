import type { AnswerValue, Field } from "@/features/forms/schema";

/** Respuesta guardada (Firestore en camelCase). */
export interface ResponseRecord {
  id: string;
  version: number;
  respondidoEn: string;
  valores: Record<string, AnswerValue>;
  uid: string | null;
}

export type NewResponseRecord = Omit<ResponseRecord, "id">;

export interface ResponsePage {
  items: ResponseRecord[];
  nextCursor: string | null;
}

export interface ResponsesRepository {
  /** Guarda la respuesta e incrementa `totalRespuestas` del formulario en la misma operación atómica. */
  add(formId: string, record: NewResponseRecord): Promise<string>;
  /** Más recientes primero; `cursor` = id de la última respuesta de la página anterior. */
  listPage(formId: string, limit: number, cursor: string | undefined): Promise<ResponsePage>;
  /** Hasta `max` respuestas (para el resumen). */
  listAll(formId: string, max: number): Promise<ResponseRecord[]>;
}

/** Puerto propio para leer formularios (lo cumple el repositorio de `forms`; se conecta en el contenedor). */
export interface FormDefinition {
  id: string;
  autorUid: string;
  campos: Field[];
  version: number;
  publicado: boolean;
  codigo: string | null;
  cierra: string | null;
}

export interface FormVersionDefinition {
  version: number;
  campos: Field[];
}

export interface FormReader {
  findById(id: string): Promise<FormDefinition | null>;
  findByCode(codigo: string): Promise<FormDefinition | null>;
  findVersions(formId: string, versions: number[]): Promise<FormVersionDefinition[]>;
}

/** Ordena más recientes primero y corta la página tras el cursor (memoria). */
export function paginateResponses(records: ResponseRecord[], limit: number, cursor: string | undefined): ResponsePage {
  const sorted = [...records].sort((a, b) => b.respondidoEn.localeCompare(a.respondidoEn));
  let start = 0;
  if (cursor !== undefined) {
    start = sorted.findIndex((record) => record.id === cursor) + 1;
  }
  const items = sorted.slice(start, start + limit);
  let nextCursor: string | null = null;
  if (start + limit < sorted.length && items.length > 0) {
    nextCursor = items[items.length - 1].id;
  }
  return { items, nextCursor };
}
