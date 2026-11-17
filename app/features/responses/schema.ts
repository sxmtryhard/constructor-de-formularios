import { z } from "zod";
import { AnswerValue, Field } from "../forms/schema";

/** `POST /api/f/:codigo/respuestas`. El servidor valida `valores` contra la definición guardada (§8). */
export const SubmitInput = z.strictObject({
  valores: z.record(z.string().max(40), AnswerValue),
});
export type SubmitInput = z.infer<typeof SubmitInput>;

export const SubmitResult = z.strictObject({ id: z.string(), version: z.number().int().min(1) });
export type SubmitResult = z.infer<typeof SubmitResult>;

/** Una respuesta guardada, con la versión del esquema con la que se respondió (§10). */
export const ResponseItem = z.strictObject({
  id: z.string(),
  version: z.number().int().min(1),
  respondido_en: z.string(),
  valores: z.record(z.string(), AnswerValue),
});
export type ResponseItem = z.infer<typeof ResponseItem>;

/** `GET /api/formularios/:id/respuestas`: respuestas + las definiciones de cada versión presente. */
export const ResponseList = z.strictObject({
  items: z.array(ResponseItem),
  siguiente_cursor: z.string().nullable(),
  versiones: z.array(z.strictObject({ version: z.number().int().min(1), campos: z.array(Field) })),
});
export type ResponseList = z.infer<typeof ResponseList>;

export const OptionCount = z.strictObject({ opcion: z.string(), cantidad: z.number().int().min(0) });

/** RF-05: agregados por pregunta de la versión vigente. */
export const QuestionSummary = z.strictObject({
  campo_id: z.string(),
  etiqueta: z.string(),
  tipo: z.string(),
  respondidas: z.number().int().min(0),
  conteos: z.array(OptionCount).nullable(),
  promedio: z.number().nullable(),
  minimo: z.number().nullable(),
  maximo: z.number().nullable(),
});
export type QuestionSummary = z.infer<typeof QuestionSummary>;

export const FormSummary = z.strictObject({
  total: z.number().int().min(0),
  version: z.number().int().min(1),
  preguntas: z.array(QuestionSummary),
});
export type FormSummary = z.infer<typeof FormSummary>;
