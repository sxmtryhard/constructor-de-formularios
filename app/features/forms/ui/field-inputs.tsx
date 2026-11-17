"use client";

import { type ComponentType, type ReactNode, useEffect, useRef } from "react";
import { type AnswerValue, type Field, type FieldType, MAX_ANSWER_CHARS } from "../schema";

/** Props comunes de los componentes de campo: uno por tipo (RF-01). */
export interface FieldInputProps {
  field: Field;
  value: AnswerValue | undefined;
  error: string | undefined;
  onChange: (value: AnswerValue) => void;
}

/** Hasta este número de opciones, la selección única se muestra con botones de opción; más, con `<select>`. */
const MAX_RADIO_OPTIONS = 5;

export function inputId(field: Field): string {
  return `campo-${field.id}`;
}

function errorId(field: Field): string {
  return `error-${field.id}`;
}

function describedBy(field: Field, error: string | undefined): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  return errorId(field);
}

function asText(value: AnswerValue | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function asList(value: AnswerValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function optional(value: number | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  return value;
}

/** Constraint Validation API: el mensaje del esquema Zod queda como validez personalizada del control. */
function useCustomValidity<E extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  error: string | undefined,
) {
  const ref = useRef<E>(null);
  useEffect(() => {
    const element = ref.current;
    if (element !== null && typeof element.setCustomValidity === "function") {
      element.setCustomValidity(error ?? "");
    }
  }, [error]);
  return ref;
}

function RequiredMark({ field }: { field: Field }) {
  if (!field.obligatorio) {
    return null;
  }
  return <em className="ml-1 text-sm font-normal text-ink-muted">(obligatorio)</em>;
}

function FieldError({ field, error }: { field: Field; error: string | undefined }) {
  if (error === undefined) {
    return null;
  }
  return (
    <strong id={errorId(field)} className="mt-1 block text-sm text-danger">
      Error: {error}
    </strong>
  );
}

function LabeledControl({ field, error, children }: { field: Field; error: string | undefined; children: ReactNode }) {
  return (
    <p className="space-y-1">
      <label htmlFor={inputId(field)} className="block font-semibold">
        {field.etiqueta}
        <RequiredMark field={field} />
      </label>
      {children}
      <FieldError field={field} error={error} />
    </p>
  );
}

function TextInput({ field, value, error, onChange }: FieldInputProps) {
  const ref = useCustomValidity<HTMLInputElement>(error);
  return (
    <LabeledControl field={field} error={error}>
      <input
        ref={ref}
        id={inputId(field)}
        data-campo={field.id}
        type="text"
        className="field-input"
        value={asText(value)}
        required={field.obligatorio}
        minLength={optional(field.reglas.min)}
        maxLength={field.reglas.max ?? MAX_ANSWER_CHARS}
        pattern={field.reglas.patron ?? undefined}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </LabeledControl>
  );
}

function ParagraphInput({ field, value, error, onChange }: FieldInputProps) {
  const ref = useCustomValidity<HTMLTextAreaElement>(error);
  return (
    <LabeledControl field={field} error={error}>
      <textarea
        ref={ref}
        id={inputId(field)}
        data-campo={field.id}
        rows={4}
        className="field-input"
        value={asText(value)}
        required={field.obligatorio}
        minLength={optional(field.reglas.min)}
        maxLength={field.reglas.max ?? MAX_ANSWER_CHARS}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </LabeledControl>
  );
}

function parseNumber(text: string): AnswerValue {
  if (text.trim() === "") {
    return null;
  }
  const parsed = Number(text);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function NumberInput({ field, value, error, onChange }: FieldInputProps) {
  const ref = useCustomValidity<HTMLInputElement>(error);
  return (
    <LabeledControl field={field} error={error}>
      <input
        ref={ref}
        id={inputId(field)}
        data-campo={field.id}
        type="number"
        inputMode="decimal"
        step="any"
        className="field-input"
        value={asText(value)}
        required={field.obligatorio}
        min={optional(field.reglas.min)}
        max={optional(field.reglas.max)}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(parseNumber(event.target.value))}
      />
    </LabeledControl>
  );
}

function DateInput({ field, value, error, onChange }: FieldInputProps) {
  const ref = useCustomValidity<HTMLInputElement>(error);
  return (
    <LabeledControl field={field} error={error}>
      <input
        ref={ref}
        id={inputId(field)}
        data-campo={field.id}
        type="date"
        className="field-input"
        value={asText(value)}
        required={field.obligatorio}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </LabeledControl>
  );
}

function SelectInput({ field, value, error, onChange }: FieldInputProps) {
  const ref = useCustomValidity<HTMLSelectElement>(error);
  return (
    <LabeledControl field={field} error={error}>
      <select
        ref={ref}
        id={inputId(field)}
        data-campo={field.id}
        className="field-input"
        value={asText(value)}
        required={field.obligatorio}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Elige una opción</option>
        {field.opciones.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </LabeledControl>
  );
}

function OptionGroup({ field, error, children }: { field: Field; error: string | undefined; children: ReactNode }) {
  return (
    <fieldset
      id={inputId(field)}
      aria-invalid={error !== undefined}
      aria-describedby={describedBy(field, error)}
      className="space-y-2"
    >
      <legend className="font-semibold">
        {field.etiqueta}
        <RequiredMark field={field} />
      </legend>
      {children}
      <FieldError field={field} error={error} />
    </fieldset>
  );
}

function RadioInput({ field, value, error, onChange }: FieldInputProps) {
  const current = asText(value);
  return (
    <OptionGroup field={field} error={error}>
      <ul className="space-y-1">
        {field.opciones.map((option, index) => (
          <li key={option}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                id={`${inputId(field)}-${index}`}
                name={field.id}
                data-campo={field.id}
                value={option}
                className="field-check"
                checked={current === option}
                required={field.obligatorio}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          </li>
        ))}
      </ul>
    </OptionGroup>
  );
}

function ChoiceInput(props: FieldInputProps) {
  if (props.field.opciones.length <= MAX_RADIO_OPTIONS) {
    return <RadioInput {...props} />;
  }
  return <SelectInput {...props} />;
}

function toggle(list: string[], option: string, checked: boolean): string[] {
  if (checked) {
    return [...list, option];
  }
  return list.filter((item) => item !== option);
}

function CheckboxesInput({ field, value, error, onChange }: FieldInputProps) {
  const selected = asList(value);
  return (
    <OptionGroup field={field} error={error}>
      <ul className="space-y-1">
        {field.opciones.map((option, index) => (
          <li key={option}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                id={`${inputId(field)}-${index}`}
                name={field.id}
                data-campo={field.id}
                value={option}
                className="field-check"
                checked={selected.includes(option)}
                onChange={(event) => onChange(toggle(selected, option, event.target.checked))}
              />
              {option}
            </label>
          </li>
        ))}
      </ul>
    </OptionGroup>
  );
}

/** Un componente por tipo de campo. */
export const FIELD_COMPONENTS: Record<FieldType, ComponentType<FieldInputProps>> = {
  texto: TextInput,
  parrafo: ParagraphInput,
  numero: NumberInput,
  seleccion: ChoiceInput,
  casillas: CheckboxesInput,
  fecha: DateInput,
};
