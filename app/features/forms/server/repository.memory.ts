import { randomUUID } from "node:crypto";
import {
  type FormPage,
  type FormPatch,
  type FormRecord,
  type FormsRepository,
  type FormVersionRecord,
  type NewFormRecord,
  paginateNewestFirst,
} from "./repository";

/** Repositorio en memoria (pruebas y demo sin Firebase). Devuelve copias para no compartir referencias. */
export class MemoryFormsRepository implements FormsRepository {
  private readonly forms = new Map<string, FormRecord>();
  private readonly versions = new Map<string, FormVersionRecord>();
  private readonly codes = new Map<string, string>();

  async create(record: NewFormRecord): Promise<FormRecord> {
    const created: FormRecord = { ...structuredClone(record), id: randomUUID() };
    this.forms.set(created.id, created);
    return structuredClone(created);
  }

  async findById(id: string): Promise<FormRecord | null> {
    const found = this.forms.get(id);
    if (found === undefined) {
      return null;
    }
    return structuredClone(found);
  }

  async listByAuthor(autorUid: string, limit: number, cursor: string | undefined): Promise<FormPage> {
    const mine = [...this.forms.values()].filter((form) => form.autorUid === autorUid);
    return structuredClone(paginateNewestFirst(mine, limit, cursor));
  }

  async update(id: string, patch: FormPatch): Promise<void> {
    const found = this.forms.get(id);
    if (found !== undefined) {
      this.forms.set(id, { ...found, ...structuredClone(patch) });
    }
  }

  async delete(id: string): Promise<void> {
    const found = this.forms.get(id);
    if (found !== undefined && found.codigo !== null) {
      this.codes.delete(found.codigo);
    }
    this.forms.delete(id);
    for (const key of [...this.versions.keys()]) {
      if (key.startsWith(`${id}/`)) {
        this.versions.delete(key);
      }
    }
  }

  async saveVersion(formId: string, version: FormVersionRecord): Promise<void> {
    this.versions.set(`${formId}/${version.version}`, structuredClone(version));
  }

  async findVersions(formId: string, versions: number[]): Promise<FormVersionRecord[]> {
    const found: FormVersionRecord[] = [];
    for (const version of versions) {
      const record = this.versions.get(`${formId}/${version}`);
      if (record !== undefined) {
        found.push(structuredClone(record));
      }
    }
    return found;
  }

  async reserveCode(codigo: string, formId: string): Promise<boolean> {
    if (this.codes.has(codigo)) {
      return false;
    }
    this.codes.set(codigo, formId);
    return true;
  }

  async findByCode(codigo: string): Promise<FormRecord | null> {
    const formId = this.codes.get(codigo);
    if (formId === undefined) {
      return null;
    }
    return this.findById(formId);
  }

  /** Lo usa el repositorio de respuestas en memoria (en Firestore es un `FieldValue.increment`). */
  async incrementResponses(formId: string): Promise<void> {
    const found = this.forms.get(formId);
    if (found !== undefined) {
      found.totalRespuestas += 1;
    }
  }
}

/**
 * Variante que, al borrar, avisa a `onDeleted` para borrar lo que vive fuera de este repositorio
 * (las respuestas, en la feature de respuestas), igual que el borrado recursivo de Firestore.
 */
export class CascadingMemoryFormsRepository extends MemoryFormsRepository {
  constructor(private readonly onDeleted: (formId: string) => Promise<void>) {
    super();
  }

  override async delete(id: string): Promise<void> {
    await super.delete(id);
    await this.onDeleted(id);
  }
}
