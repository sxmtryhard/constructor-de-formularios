import { randomUUID } from "node:crypto";
import {
  type NewResponseRecord,
  paginateResponses,
  type ResponsePage,
  type ResponseRecord,
  type ResponsesRepository,
} from "./repository";

/** Repositorio de respuestas en memoria; `onAdded` incrementa el contador del formulario. */
export class MemoryResponsesRepository implements ResponsesRepository {
  private readonly byForm = new Map<string, ResponseRecord[]>();

  constructor(private readonly onAdded: (formId: string) => Promise<void> = async () => {}) {}

  async add(formId: string, record: NewResponseRecord): Promise<string> {
    const id = randomUUID();
    const list = this.byForm.get(formId) ?? [];
    list.push({ ...structuredClone(record), id });
    this.byForm.set(formId, list);
    await this.onAdded(formId);
    return id;
  }

  async listPage(formId: string, limit: number, cursor: string | undefined): Promise<ResponsePage> {
    return structuredClone(paginateResponses(this.byForm.get(formId) ?? [], limit, cursor));
  }

  async listAll(formId: string, max: number): Promise<ResponseRecord[]> {
    return structuredClone((this.byForm.get(formId) ?? []).slice(0, max));
  }
}
