import type { Field, FieldRules } from "@/features/forms/schema";

type FieldOverrides = Partial<Omit<Field, "reglas">> & { reglas?: Partial<FieldRules> };

/** Campo de formulario válido por defecto (texto opcional sin reglas); se sobrescribe lo que importe a la prueba. */
export function makeField(id: string, overrides: FieldOverrides = {}): Field {
  const { reglas, ...rest } = overrides;
  return {
    id,
    tipo: "texto",
    etiqueta: `Pregunta ${id}`,
    obligatorio: false,
    opciones: [],
    visible_si: null,
    ...rest,
    reglas: { min: null, max: null, patron: null, ...reglas },
  };
}

/** Lista de `count` campos de texto válidos con ids `c1`, `c2`… */
export function makeFields(count: number): Field[] {
  return Array.from({ length: count }, (_, index) => makeField(`c${index + 1}`));
}
