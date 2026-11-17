import {
  type Field,
  type FieldRules,
  type FieldType,
  type Form,
  type FormInput,
  MAX_FIELDS,
  type VisibleIf,
} from "../schema";

/** Estado del constructor: lo editable de un formulario. */
export interface BuilderState {
  titulo: string;
  descripcion: string;
  campos: Field[];
  cambiado: boolean;
}

export type FieldChanges = Partial<Pick<Field, "etiqueta" | "obligatorio">>;

export type BuilderAction =
  | { type: "cargar"; form: Form }
  | { type: "titulo"; value: string }
  | { type: "descripcion"; value: string }
  | { type: "agregar"; tipo: FieldType; index: number | null }
  | { type: "quitar"; id: string }
  | { type: "mover"; id: string; delta: -1 | 1 }
  | { type: "mover-a"; id: string; index: number }
  | { type: "editar"; id: string; cambios: FieldChanges }
  | { type: "opciones"; id: string; opciones: string[] }
  | { type: "reglas"; id: string; reglas: Partial<FieldRules> }
  | { type: "condicion"; id: string; visible_si: VisibleIf | null }
  | { type: "guardado" };

export const INITIAL_BUILDER: BuilderState = { titulo: "", descripcion: "", campos: [], cambiado: false };

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  texto: "Texto corto",
  parrafo: "Párrafo",
  numero: "Número",
  seleccion: "Selección única",
  casillas: "Casillas",
  fecha: "Fecha",
};

const CHOICE_TYPES: FieldType[] = ["seleccion", "casillas"];

/** Ids generados `campo_1`, `campo_2`…: siguiente número libre. */
export function nextFieldId(campos: Field[]): string {
  let max = 0;
  for (const field of campos) {
    const match = /^campo_(\d+)$/.exec(field.id);
    if (match !== null) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `campo_${max + 1}`;
}

function newField(tipo: FieldType, campos: Field[]): Field {
  let opciones: string[] = [];
  if (CHOICE_TYPES.includes(tipo)) {
    opciones = ["Opción 1", "Opción 2"];
  }
  return {
    id: nextFieldId(campos),
    tipo,
    etiqueta: FIELD_TYPE_LABEL[tipo],
    obligatorio: false,
    opciones,
    reglas: { min: null, max: null, patron: null },
    visible_si: null,
  };
}

/** Tras quitar o mover, una condición que ya no apunta a un campo anterior se elimina. */
function dropBrokenConditions(campos: Field[]): Field[] {
  return campos.map((field, index) => {
    if (field.visible_si === null) {
      return field;
    }
    const target = field.visible_si.campo_id;
    if (campos.slice(0, index).some((previous) => previous.id === target)) {
      return field;
    }
    return { ...field, visible_si: null };
  });
}

function insertAt(campos: Field[], field: Field, index: number | null): Field[] {
  const copy = [...campos];
  let position = copy.length;
  if (index !== null) {
    position = Math.max(0, Math.min(index, copy.length));
  }
  copy.splice(position, 0, field);
  return copy;
}

/** Mueve el campo `id` a la posición de inserción `slot` (índice en la lista original). */
function moveTo(campos: Field[], id: string, slot: number): Field[] {
  const from = campos.findIndex((field) => field.id === id);
  if (from < 0) {
    return campos;
  }
  const copy = [...campos];
  const [moved] = copy.splice(from, 1);
  let target = slot;
  if (slot > from) {
    target = slot - 1;
  }
  copy.splice(Math.max(0, Math.min(target, copy.length)), 0, moved);
  return dropBrokenConditions(copy);
}

function moveBy(campos: Field[], id: string, delta: -1 | 1): Field[] {
  const from = campos.findIndex((field) => field.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= campos.length) {
    return campos;
  }
  const copy = [...campos];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return dropBrokenConditions(copy);
}

function updateField(campos: Field[], id: string, update: (field: Field) => Field): Field[] {
  return campos.map((field) => {
    if (field.id === id) {
      return update(field);
    }
    return field;
  });
}

function withFields(state: BuilderState, campos: Field[]): BuilderState {
  return { ...state, campos, cambiado: true };
}

function fieldAction(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "editar":
      return withFields(
        state,
        updateField(state.campos, action.id, (field) => ({ ...field, ...action.cambios })),
      );
    case "opciones":
      return withFields(
        state,
        updateField(state.campos, action.id, (field) => ({ ...field, opciones: action.opciones })),
      );
    case "reglas":
      return withFields(
        state,
        updateField(state.campos, action.id, (field) => ({ ...field, reglas: { ...field.reglas, ...action.reglas } })),
      );
    case "condicion":
      return withFields(
        state,
        updateField(state.campos, action.id, (field) => ({ ...field, visible_si: action.visible_si })),
      );
    default:
      return state;
  }
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "cargar":
      return {
        titulo: action.form.titulo,
        descripcion: action.form.descripcion,
        campos: action.form.campos,
        cambiado: false,
      };
    case "titulo":
      return { ...state, titulo: action.value, cambiado: true };
    case "descripcion":
      return { ...state, descripcion: action.value, cambiado: true };
    case "agregar":
      if (state.campos.length >= MAX_FIELDS) {
        return state;
      }
      return withFields(state, insertAt(state.campos, newField(action.tipo, state.campos), action.index));
    case "quitar":
      return withFields(state, dropBrokenConditions(state.campos.filter((field) => field.id !== action.id)));
    case "mover":
      return withFields(state, moveBy(state.campos, action.id, action.delta));
    case "mover-a":
      return withFields(state, moveTo(state.campos, action.id, action.index));
    case "guardado":
      return { ...state, cambiado: false };
    default:
      return fieldAction(state, action);
  }
}

/** Limpia lo que se escribe a mano (opciones vacías, espacios) antes de enviar el `FormInput`. */
export function toFormInput(state: BuilderState): FormInput {
  return {
    titulo: state.titulo,
    descripcion: state.descripcion,
    campos: state.campos.map((field) => {
      let opciones: string[] = [];
      if (CHOICE_TYPES.includes(field.tipo)) {
        opciones = field.opciones.map((option) => option.trim()).filter((option) => option !== "");
      }
      let patron = field.reglas.patron;
      if (field.tipo !== "texto" || patron === "") {
        patron = null;
      }
      return { ...field, opciones, reglas: { ...field.reglas, patron } };
    }),
  };
}
