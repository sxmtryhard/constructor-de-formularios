"use client";

import type { ActionDispatch } from "react";
import type { Field, FieldRules, FieldType } from "../schema";
import { type BuilderAction, FIELD_TYPE_LABEL } from "./builder-reducer";

type Dispatch = ActionDispatch<[action: BuilderAction]>;

const RULE_LABELS: Record<FieldType, { min: string; max: string } | null> = {
  texto: { min: "Mínimo de caracteres", max: "Máximo de caracteres" },
  parrafo: { min: "Mínimo de caracteres", max: "Máximo de caracteres" },
  numero: { min: "Valor mínimo", max: "Valor máximo" },
  casillas: { min: "Mínimo de opciones marcadas", max: "Máximo de opciones marcadas" },
  seleccion: null,
  fecha: null,
};

function parseRule(text: string): number | null {
  if (text.trim() === "") {
    return null;
  }
  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function ruleText(value: number | null): string {
  if (value === null) {
    return "";
  }
  return String(value);
}

function NumberRule({
  field,
  rule,
  label,
  dispatch,
}: {
  field: Field;
  rule: "min" | "max";
  label: string;
  dispatch: Dispatch;
}) {
  const id = `${field.id}-${rule}`;
  return (
    <p>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        className="field-input"
        value={ruleText(field.reglas[rule])}
        onChange={(event) => {
          const reglas: Partial<FieldRules> = { [rule]: parseRule(event.target.value) };
          dispatch({ type: "reglas", id: field.id, reglas });
        }}
      />
    </p>
  );
}

function RulesEditor({ field, dispatch }: { field: Field; dispatch: Dispatch }) {
  const labels = RULE_LABELS[field.tipo];
  if (labels === null) {
    return null;
  }
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <NumberRule field={field} rule="min" label={labels.min} dispatch={dispatch} />
      <NumberRule field={field} rule="max" label={labels.max} dispatch={dispatch} />
      {field.tipo === "texto" && (
        <p>
          <label htmlFor={`${field.id}-patron`} className="mb-1 block text-sm font-semibold">
            Patrón (expresión regular)
          </label>
          <input
            id={`${field.id}-patron`}
            type="text"
            className="field-input font-mono"
            maxLength={100}
            value={field.reglas.patron ?? ""}
            onChange={(event) => dispatch({ type: "reglas", id: field.id, reglas: { patron: event.target.value } })}
          />
        </p>
      )}
    </div>
  );
}

function OptionsEditor({ field, dispatch }: { field: Field; dispatch: Dispatch }) {
  if (field.tipo !== "seleccion" && field.tipo !== "casillas") {
    return null;
  }
  const id = `${field.id}-opciones`;
  return (
    <p>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        Opciones (una por línea)
      </label>
      <textarea
        id={id}
        rows={4}
        className="field-input"
        value={field.opciones.join("\n")}
        onChange={(event) => dispatch({ type: "opciones", id: field.id, opciones: event.target.value.split("\n") })}
      />
    </p>
  );
}

function ConditionValue({ field, parent, dispatch }: { field: Field; parent: Field; dispatch: Dispatch }) {
  const id = `${field.id}-valor`;
  const valor = field.visible_si?.valor ?? "";
  function update(value: string) {
    dispatch({ type: "condicion", id: field.id, visible_si: { campo_id: parent.id, valor: value } });
  }
  if (parent.opciones.length > 0) {
    return (
      <p>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold">
          …vale
        </label>
        <select id={id} className="field-input" value={valor} onChange={(event) => update(event.target.value)}>
          <option value="">Elige un valor</option>
          {parent.opciones
            .filter((option) => option.trim() !== "")
            .map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </select>
      </p>
    );
  }
  return (
    <p>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        …vale
      </label>
      <input
        id={id}
        type="text"
        className="field-input"
        value={valor}
        onChange={(event) => update(event.target.value)}
      />
    </p>
  );
}

function ConditionEditor({ field, previous, dispatch }: { field: Field; previous: Field[]; dispatch: Dispatch }) {
  if (previous.length === 0) {
    return null;
  }
  const id = `${field.id}-condicion`;
  const parent = previous.find((candidate) => candidate.id === field.visible_si?.campo_id);
  function choose(campoId: string) {
    if (campoId === "") {
      dispatch({ type: "condicion", id: field.id, visible_si: null });
      return;
    }
    dispatch({ type: "condicion", id: field.id, visible_si: { campo_id: campoId, valor: "" } });
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <p>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold">
          Mostrar si el campo…
        </label>
        <select
          id={id}
          className="field-input"
          value={field.visible_si?.campo_id ?? ""}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">Mostrar siempre</option>
          {previous.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.etiqueta}
            </option>
          ))}
        </select>
      </p>
      {parent !== undefined && <ConditionValue field={field} parent={parent} dispatch={dispatch} />}
    </div>
  );
}

interface FieldEditorProps {
  field: Field;
  index: number;
  total: number;
  previous: Field[];
  dispatch: Dispatch;
  dragSupported: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

function FieldToolbar({ field, index, total, dispatch, dragSupported, onDragStart, onDragEnd }: FieldEditorProps) {
  const name = field.etiqueta;
  return (
    <div className="flex flex-wrap gap-2">
      {dragSupported && (
        <button
          type="button"
          draggable
          className="btn-secondary cursor-grab"
          aria-label={`Arrastrar ${name} (también puedes usar Subir y Bajar)`}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", field.id);
            onDragStart(field.id);
          }}
          onDragEnd={onDragEnd}
        >
          ⠿ Arrastrar
        </button>
      )}
      <button
        type="button"
        className="btn-secondary"
        disabled={index === 0}
        onClick={() => dispatch({ type: "mover", id: field.id, delta: -1 })}
      >
        Subir <strong className="sr-only">{name}</strong>
      </button>
      <button
        type="button"
        className="btn-secondary"
        disabled={index === total - 1}
        onClick={() => dispatch({ type: "mover", id: field.id, delta: 1 })}
      >
        Bajar <strong className="sr-only">{name}</strong>
      </button>
      <button type="button" className="btn-danger" onClick={() => dispatch({ type: "quitar", id: field.id })}>
        Quitar <strong className="sr-only">{name}</strong>
      </button>
    </div>
  );
}

/** Tarjeta de edición de un campo: propiedades, opciones, reglas y condición. */
export function FieldEditor(props: FieldEditorProps) {
  const { field, index, previous, dispatch } = props;
  return (
    <article
      aria-labelledby={`${field.id}-titulo`}
      className="space-y-3 rounded-lg border border-line bg-surface-alt p-4"
    >
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <h3 id={`${field.id}-titulo`} className="font-semibold text-primary-strong">
          {index + 1}. {FIELD_TYPE_LABEL[field.tipo]} <code className="text-sm text-ink-muted">({field.id})</code>
        </h3>
        <FieldToolbar {...props} />
      </header>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <p>
          <label htmlFor={`${field.id}-etiqueta`} className="mb-1 block text-sm font-semibold">
            Etiqueta
          </label>
          <input
            id={`${field.id}-etiqueta`}
            type="text"
            className="field-input"
            maxLength={200}
            required
            value={field.etiqueta}
            onChange={(event) => dispatch({ type: "editar", id: field.id, cambios: { etiqueta: event.target.value } })}
          />
        </p>
        <p>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
            <input
              type="checkbox"
              className="field-check"
              checked={field.obligatorio}
              onChange={(event) =>
                dispatch({ type: "editar", id: field.id, cambios: { obligatorio: event.target.checked } })
              }
            />
            Obligatorio
          </label>
        </p>
      </div>
      <OptionsEditor field={field} dispatch={dispatch} />
      <RulesEditor field={field} dispatch={dispatch} />
      <ConditionEditor field={field} previous={previous} dispatch={dispatch} />
    </article>
  );
}
