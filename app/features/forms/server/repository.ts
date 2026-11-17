import type { Field } from "../schema";

/** Formulario guardado (Firestore en camelCase; fechas en ISO 8601). */
export interface FormRecord {
  id: string;
  autorUid: string;
  titulo: string;
  descripcion: string;
  campos: Field[];
  version: number;
  publicado: boolean;
  codigo: string | null;
  cierra: string | null;
  totalRespuestas: number;
  creadoEn: string;
  actualizadoEn: string;
}

export type NewFormRecord = Omit<FormRecord, "id">;

/** Lo que un guardado puede cambiar (nunca `totalRespuestas`, que solo incrementa la feature de respuestas). */
export type FormPatch = Partial<
  Pick<
    FormRecord,
    "titulo" | "descripcion" | "campos" | "version" | "publicado" | "codigo" | "cierra" | "actualizadoEn"
  >
>;

export interface FormVersionRecord {
  version: number;
  campos: Field[];
  creadaEn: string;
}

export interface FormPage {
  items: FormRecord[];
  nextCursor: string | null;
}

export interface FormsRepository {
  create(record: NewFormRecord): Promise<FormRecord>;
  findById(id: string): Promise<FormRecord | null>;
  /** Formularios del autor, más recientes primero; `cursor` = id del último de la página anterior. */
  listByAuthor(autorUid: string, limit: number, cursor: string | undefined): Promise<FormPage>;
  update(id: string, patch: FormPatch): Promise<void>;
  delete(id: string): Promise<void>;
  saveVersion(formId: string, version: FormVersionRecord): Promise<void>;
  findVersions(formId: string, versions: number[]): Promise<FormVersionRecord[]>;
  /** Reserva `codigos/{codigo}` para el formulario; `false` si ya estaba tomado. */
  reserveCode(codigo: string, formId: string): Promise<boolean>;
  findByCode(codigo: string): Promise<FormRecord | null>;
}

/** Ordena más recientes primero y corta la página tras el cursor (lo comparten memoria y Firestore). */
export function paginateNewestFirst(records: FormRecord[], limit: number, cursor: string | undefined): FormPage {
  const sorted = [...records].sort((a, b) => {
    if (a.creadoEn === b.creadoEn) {
      return b.id.localeCompare(a.id);
    }
    return b.creadoEn.localeCompare(a.creadoEn);
  });
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
