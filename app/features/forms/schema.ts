import { z } from "zod";

/** Límites del enunciado (§8). */
export const MAX_FIELDS = 30;
export const MAX_ANSWER_CHARS = 1000;
export const MAX_PATTERN_CHARS = 100;
export const MAX_OPTIONS = 50;

/** RF-01: tipos de campo. */
export const FieldType = z.enum(["texto", "parrafo", "numero", "seleccion", "casillas", "fecha"]);
export type FieldType = z.infer<typeof FieldType>;

const FIELD_ID = /^[a-z][a-z0-9_]{0,39}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Máximo de cuantificadores sin tope (`+`, `*`, `{n,}`): con 2, el peor caso sobre 1000 caracteres es ~10⁶ pasos. */
const MAX_UNBOUNDED_QUANTIFIERS = 2;

/**
 * Límite de complejidad del patrón del creador para evitar ReDoS (§8). Conservador a propósito:
 * longitud máxima, debe compilar, sin referencias hacia atrás, **ningún grupo repetido**
 * (`)` seguido de `+`, `*` o `{`: cubre `(a+)+`, `((a+))+`, `(a|a)*`, `(a|b+){2,}`) y como mucho
 * 2 cuantificadores sin tope (evita la explosión polinómica de `a*a*a*a*…`). Un grupo opcional `(…)?` sí se permite.
 */
export function isSafePattern(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_CHARS) {
    return false;
  }
  try {
    new RegExp(pattern);
  } catch {
    return false;
  }
  if (/\\[1-9]/.test(pattern)) {
    return false;
  }
  if (/\)\s*[+*{]/.test(pattern)) {
    return false;
  }
  const unbounded = pattern.match(/(?<!\\)[+*]|\{\d+,\}/g) ?? [];
  return unbounded.length <= MAX_UNBOUNDED_QUANTIFIERS;
}

/** RF-02: reglas por campo. `min`/`max` = longitud (texto/párrafo), valor (número) u opciones marcadas (casillas). */
export const FieldRules = z.strictObject({
  min: z.number().int().min(0).max(1_000_000).nullable(),
  max: z.number().int().min(0).max(1_000_000).nullable(),
  patron: z
    .string()
    .max(MAX_PATTERN_CHARS)
    .refine(isSafePattern, "Patrón no permitido (demasiado complejo)")
    .nullable(),
});
export type FieldRules = z.infer<typeof FieldRules>;

/** RF-03: mostrar el campo solo si otro campo vale `valor`. */
export const VisibleIf = z.strictObject({
  campo_id: z.string().regex(FIELD_ID),
  valor: z.string().max(200),
});
export type VisibleIf = z.infer<typeof VisibleIf>;

export const Field = z.strictObject({
  id: z.string().regex(FIELD_ID, "Id de campo inválido"),
  tipo: FieldType,
  etiqueta: z.string().trim().min(1, "La etiqueta es obligatoria").max(200),
  obligatorio: z.boolean(),
  opciones: z.array(z.string().trim().min(1).max(200)).max(MAX_OPTIONS),
  reglas: FieldRules,
  visible_si: VisibleIf.nullable(),
});
export type Field = z.infer<typeof Field>;

function hasDuplicateIds(fields: Field[]): boolean {
  return new Set(fields.map((field) => field.id)).size !== fields.length;
}

function choiceWithoutOptions(fields: Field[]): boolean {
  return fields.some(
    (field) => (field.tipo === "seleccion" || field.tipo === "casillas") && field.opciones.length === 0,
  );
}

function conditionPointsNowhere(fields: Field[]): boolean {
  return fields.some((field, index) => {
    if (field.visible_si === null) {
      return false;
    }
    const target = field.visible_si.campo_id;
    return !fields.slice(0, index).some((previous) => previous.id === target);
  });
}

/** Lista de campos válida: máx. 30, ids únicos, selección con opciones, condición sobre un campo anterior. */
export const FieldList = z
  .array(Field)
  .max(MAX_FIELDS, `Máximo ${MAX_FIELDS} campos`)
  .refine((fields) => !hasDuplicateIds(fields), "Hay ids de campo repetidos")
  .refine((fields) => !choiceWithoutOptions(fields), "Los campos de selección y casillas necesitan opciones")
  .refine((fields) => !conditionPointsNowhere(fields), "La condición debe apuntar a un campo anterior");

/** Cuerpo de crear y editar un formulario. */
export const FormInput = z.strictObject({
  titulo: z.string().trim().min(1, "El título es obligatorio").max(150),
  descripcion: z.string().trim().max(1000),
  campos: FieldList,
});
export type FormInput = z.infer<typeof FormInput>;

/** RF-04: publicar con fecha de cierre opcional (ISO 8601 UTC). */
export const PublishInput = z.strictObject({
  cierra: z.iso.datetime().nullable(),
});
export type PublishInput = z.infer<typeof PublishInput>;

/** Formulario tal como lo ve su autor. */
export const Form = z.strictObject({
  id: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  campos: z.array(Field),
  version: z.number().int().min(1),
  publicado: z.boolean(),
  codigo: z.string().nullable(),
  cierra: z.string().nullable(),
  total_respuestas: z.number().int().min(0),
  creado_en: z.string(),
  actualizado_en: z.string(),
});
export type Form = z.infer<typeof Form>;

export const FormList = z.strictObject({
  items: z.array(Form),
  siguiente_cursor: z.string().nullable(),
});
export type FormList = z.infer<typeof FormList>;

/** `GET /api/f/:codigo`: definición pública, sin datos privados (§9.4). */
export const PublicForm = z.strictObject({
  codigo: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  campos: z.array(Field),
  version: z.number().int().min(1),
  cierra: z.string().nullable(),
});
export type PublicForm = z.infer<typeof PublicForm>;

/** Valor de una respuesta: texto/párrafo/fecha/selección = string, número = number, casillas = string[]. */
export const AnswerValue = z.union([z.string(), z.number(), z.array(z.string()), z.null()]);
export type AnswerValue = z.infer<typeof AnswerValue>;
export type AnswerValues = Partial<Record<string, AnswerValue>>;

export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function answerMatches(value: AnswerValue | undefined, expected: string): boolean {
  if (Array.isArray(value)) {
    return value.includes(expected);
  }
  if (value === undefined || value === null) {
    return false;
  }
  return String(value) === expected;
}

/** RF-03: un campo es visible si no tiene condición o si el campo del que depende (visible) vale lo esperado. */
export function isFieldVisible(field: Field, fields: Field[], values: AnswerValues): boolean {
  if (field.visible_si === null) {
    return true;
  }
  const condition = field.visible_si;
  const parent = fields.find((candidate) => candidate.id === condition.campo_id);
  if (parent === undefined || !isFieldVisible(parent, fields, values)) {
    return false;
  }
  return answerMatches(values[parent.id], condition.valor);
}

function textSchema(field: Field) {
  let schema = z.string().max(MAX_ANSWER_CHARS, `Máximo ${MAX_ANSWER_CHARS} caracteres`);
  if (field.reglas.min !== null) {
    schema = schema.refine((text) => text.length === 0 || text.length >= (field.reglas.min ?? 0), {
      message: `Mínimo ${field.reglas.min} caracteres`,
    });
  }
  if (field.reglas.max !== null) {
    schema = schema.max(field.reglas.max, `Máximo ${field.reglas.max} caracteres`);
  }
  if (field.tipo === "texto" && field.reglas.patron !== null) {
    const pattern = new RegExp(`^(?:${field.reglas.patron})$`);
    schema = schema.refine((text) => text.length === 0 || pattern.test(text), { message: "Formato no válido" });
  }
  return schema;
}

function numberSchema(field: Field) {
  let schema = z.number({ error: "Debe ser un número" });
  if (field.reglas.min !== null) {
    schema = schema.min(field.reglas.min, `Mínimo ${field.reglas.min}`);
  }
  if (field.reglas.max !== null) {
    schema = schema.max(field.reglas.max, `Máximo ${field.reglas.max}`);
  }
  return schema;
}

function choiceSchema(field: Field) {
  return z.string().refine((text) => text.length === 0 || field.opciones.includes(text), {
    message: "Opción no válida",
  });
}

function checkboxSchema(field: Field) {
  let schema = z
    .array(z.string())
    .max(field.opciones.length)
    .refine((items) => items.every((item) => field.opciones.includes(item)), { message: "Opción no válida" })
    .refine((items) => new Set(items).size === items.length, { message: "Opciones repetidas" });
  if (field.reglas.min !== null) {
    const min = field.reglas.min;
    schema = schema.refine((items) => items.length === 0 || items.length >= min, { message: `Marca al menos ${min}` });
  }
  if (field.reglas.max !== null) {
    const max = field.reglas.max;
    schema = schema.refine((items) => items.length <= max, { message: `Marca como máximo ${max}` });
  }
  return schema;
}

function dateSchema() {
  return z.string().refine((text) => text.length === 0 || ISO_DATE.test(text), { message: "Fecha no válida" });
}

const VALUE_SCHEMAS: Record<FieldType, (field: Field) => z.ZodType<AnswerValue>> = {
  texto: textSchema,
  parrafo: textSchema,
  numero: numberSchema,
  seleccion: choiceSchema,
  casillas: checkboxSchema,
  fecha: dateSchema,
};

/** Esquema Zod de un solo valor según el tipo y las reglas del campo (puede ser `null` = vacío). */
export function buildFieldValueSchema(field: Field): z.ZodType<AnswerValue> {
  return VALUE_SCHEMAS[field.tipo](field).nullable();
}

/**
 * §6 y §8: esquema de respuestas generado desde la definición. Lo usan el cliente y el servidor.
 * - Estricto: un campo no definido → error (decisión documentada en docs/specs/F0-F14-mvp.md).
 * - Obligatorio vacío → error, solo si el campo es visible.
 */
export function buildAnswerSchema(fields: Field[]) {
  const shape: Record<string, z.ZodOptional<z.ZodType<AnswerValue>>> = {};
  for (const field of fields) {
    shape[field.id] = buildFieldValueSchema(field).optional();
  }
  return z.strictObject(shape).superRefine((values, context) => {
    for (const field of fields) {
      const visible = isFieldVisible(field, fields, values);
      if (visible && field.obligatorio && isEmptyAnswer(values[field.id])) {
        context.addIssue({ code: "custom", path: [field.id], message: "Este campo es obligatorio" });
      }
    }
  });
}

/** Deja solo los valores de los campos visibles (los ocultos se guardan como `null`). */
export function keepVisibleAnswers(fields: Field[], values: AnswerValues): AnswerValues {
  const result: AnswerValues = {};
  for (const field of fields) {
    const value = values[field.id];
    if (isFieldVisible(field, fields, values) && value !== undefined) {
      result[field.id] = value;
    } else {
      result[field.id] = null;
    }
  }
  return result;
}
