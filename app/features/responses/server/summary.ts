import type { AnswerValue, Field } from "@/features/forms/schema";
import { isEmptyAnswer } from "@/features/forms/schema";
import type { QuestionSummary } from "../schema";
import type { ResponseRecord } from "./repository";

function countOptions(field: Field, values: (AnswerValue | undefined)[]): QuestionSummary["conteos"] {
  if (field.tipo !== "seleccion" && field.tipo !== "casillas") {
    return null;
  }
  return field.opciones.map((opcion) => {
    const cantidad = values.filter((value) => {
      if (Array.isArray(value)) {
        return value.includes(opcion);
      }
      return value === opcion;
    }).length;
    return { opcion, cantidad };
  });
}

function numericStats(field: Field, values: (AnswerValue | undefined)[]) {
  const empty = { promedio: null, minimo: null, maximo: null };
  if (field.tipo !== "numero") {
    return empty;
  }
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numbers.length === 0) {
    return empty;
  }
  const total = numbers.reduce((sum, value) => sum + value, 0);
  return { promedio: total / numbers.length, minimo: Math.min(...numbers), maximo: Math.max(...numbers) };
}

/**
 * RF-05: agregados por pregunta de la versión vigente. Se usan todas las respuestas leídas; cada valor
 * se cuenta por el id del campo y solo si su tipo encaja (un número en un campo `numero`, etc.).
 */
export function summarizeQuestions(fields: Field[], responses: ResponseRecord[]): QuestionSummary[] {
  return fields.map((field) => {
    const values = responses.map((response) => response.valores[field.id]);
    return {
      campo_id: field.id,
      etiqueta: field.etiqueta,
      tipo: field.tipo,
      respondidas: values.filter((value) => !isEmptyAnswer(value)).length,
      conteos: countOptions(field, values),
      ...numericStats(field, values),
    };
  });
}
