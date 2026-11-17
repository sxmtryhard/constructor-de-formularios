import { type AnswerValue, buildAnswerSchema, keepVisibleAnswers } from "@/features/forms/schema";
import type { PageQuery } from "@/shared/schema";
import { GoneError, NotFoundError, ValidationError } from "@/shared/server/errors";
import { zodDetails } from "@/shared/server/validation";
import type { FormSummary, ResponseList, SubmitInput, SubmitResult } from "../schema";
import type { FormDefinition, FormReader, ResponseRecord, ResponsesRepository } from "./repository";
import { summarizeQuestions } from "./summary";

/** Máximo de respuestas leídas para el resumen (spec, decisión 10). */
export const MAX_SUMMARY_RESPONSES = 5000;

export interface ResponsesService {
  /** Envío público por código: 404 si no existe o no está publicado, 410 si cerró, 400 con detalles por campo. */
  submit(codigo: string, input: SubmitInput, now: Date): Promise<SubmitResult>;
  list(uid: string, formId: string, query: PageQuery): Promise<ResponseList>;
  summary(uid: string, formId: string): Promise<FormSummary>;
}

export interface ResponsesServiceDeps {
  forms: FormReader;
  responses: ResponsesRepository;
}

function assertOpen(form: FormDefinition | null, now: Date): FormDefinition {
  if (form === null || !form.publicado || form.codigo === null) {
    throw new NotFoundError("Formulario no encontrado");
  }
  if (form.cierra !== null && now.getTime() >= Date.parse(form.cierra)) {
    throw new GoneError("El formulario está cerrado");
  }
  return form;
}

function toItem(record: ResponseRecord): ResponseList["items"][number] {
  return { id: record.id, version: record.version, respondido_en: record.respondidoEn, valores: record.valores };
}

function compact(values: Partial<Record<string, AnswerValue>>): Record<string, AnswerValue> {
  const result: Record<string, AnswerValue> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function createResponsesService(deps: ResponsesServiceDeps): ResponsesService {
  async function findOwned(uid: string, formId: string): Promise<FormDefinition> {
    const form = await deps.forms.findById(formId);
    if (form === null || form.autorUid !== uid) {
      throw new NotFoundError("Formulario no encontrado");
    }
    return form;
  }

  async function versionsFor(form: FormDefinition, records: ResponseRecord[]): Promise<ResponseList["versiones"]> {
    const present = [...new Set(records.map((record) => record.version))].sort((a, b) => a - b);
    const stored = await deps.forms.findVersions(form.id, present);
    return present.map((version) => {
      const found = stored.find((candidate) => candidate.version === version);
      if (found !== undefined) {
        return { version, campos: found.campos };
      }
      // Sin copia guardada: si es la vigente, se usan los campos actuales.
      if (version === form.version) {
        return { version, campos: form.campos };
      }
      return { version, campos: [] };
    });
  }

  return {
    async submit(codigo, input, now) {
      const form = assertOpen(await deps.forms.findByCode(codigo), now);
      const parsed = buildAnswerSchema(form.campos).safeParse(input.valores);
      if (!parsed.success) {
        throw new ValidationError("La respuesta no es válida", zodDetails(parsed.error));
      }
      const valores = compact(keepVisibleAnswers(form.campos, parsed.data));
      const id = await deps.responses.add(form.id, {
        version: form.version,
        respondidoEn: now.toISOString(),
        valores,
        uid: null,
      });
      return { id, version: form.version };
    },

    async list(uid, formId, query) {
      const form = await findOwned(uid, formId);
      const page = await deps.responses.listPage(formId, query.limite, query.cursor);
      return {
        items: page.items.map(toItem),
        siguiente_cursor: page.nextCursor,
        versiones: await versionsFor(form, page.items),
      };
    },

    async summary(uid, formId) {
      const form = await findOwned(uid, formId);
      const records = await deps.responses.listAll(formId, MAX_SUMMARY_RESPONSES);
      return { total: records.length, version: form.version, preguntas: summarizeQuestions(form.campos, records) };
    },
  };
}
