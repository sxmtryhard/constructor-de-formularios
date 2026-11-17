"use client";

import { type FormEvent, useState } from "react";
import { type AnswerValue, type AnswerValues, buildAnswerSchema, type Field, isFieldVisible } from "../schema";
import { FIELD_COMPONENTS, inputId } from "./field-inputs";

export type FieldErrors = Partial<Record<string, string>>;

/** Resultado de enviar: éxito o errores (por campo y uno general). */
export type SubmitOutcome = { ok: true } | { ok: false; byField: FieldErrors; general: string | null };

interface FormRendererProps {
  titulo: string;
  descripcion: string;
  campos: Field[];
  submitLabel: string;
  onSubmit: (valores: Record<string, AnswerValue>) => Promise<SubmitOutcome>;
  headingLevel?: HeadingLevel;
}

/** Solo los campos visibles se envían; un campo visible vacío va como `null`. */
export function visiblePayload(campos: Field[], values: AnswerValues): Record<string, AnswerValue> {
  const payload: Record<string, AnswerValue> = {};
  for (const field of campos) {
    if (isFieldVisible(field, campos, values)) {
      payload[field.id] = values[field.id] ?? null;
    }
  }
  return payload;
}

function zodErrors(campos: Field[], payload: Record<string, AnswerValue>): FieldErrors {
  const errors: FieldErrors = {};
  const result = buildAnswerSchema(campos).safeParse(payload);
  if (result.success) {
    return errors;
  }
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key !== "" && errors[key] === undefined) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isControl(element: Element): element is Control {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

/** Constraint Validation API (si existe): añade los errores nativos que Zod no haya detectado. */
function nativeErrors(form: HTMLFormElement, errors: FieldErrors): FieldErrors {
  if (typeof form.checkValidity !== "function" || form.checkValidity()) {
    return errors;
  }
  const merged: FieldErrors = { ...errors };
  for (const element of Array.from(form.elements)) {
    if (!isControl(element)) {
      continue;
    }
    const campo = element.dataset.campo;
    if (
      campo !== undefined &&
      !element.validity.valid &&
      !element.validity.customError &&
      merged[campo] === undefined
    ) {
      merged[campo] = element.validationMessage;
    }
  }
  return merged;
}

function ErrorSummary({ campos, errors, general }: { campos: Field[]; errors: FieldErrors; general: string | null }) {
  const withError = campos.filter((field) => errors[field.id] !== undefined);
  if (withError.length === 0 && general === null) {
    return null;
  }
  return (
    <section role="alert" aria-labelledby="resumen-errores" className="rounded-lg border-2 border-danger p-4">
      <h2 id="resumen-errores" className="font-bold text-danger">
        Revisa el formulario
      </h2>
      {general !== null && <p className="text-danger">{general}</p>}
      <ul className="mt-2 list-disc pl-6">
        {withError.map((field) => (
          <li key={field.id}>
            <a href={`#${inputId(field)}`} className="link text-danger">
              {field.etiqueta}: {errors[field.id]}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

type HeadingLevel = "h1" | "h3";

function Heading({ level, children }: { level: HeadingLevel; children: string }) {
  if (level === "h1") {
    return <h1 className="text-3xl font-bold text-primary-strong">{children}</h1>;
  }
  return <h3 className="text-lg font-bold text-primary-strong">{children}</h3>;
}

/** Renderer dinámico: lo usan la página pública y la vista previa del constructor. */
export function FormRenderer({
  titulo,
  descripcion,
  campos,
  submitLabel,
  onSubmit,
  headingLevel = "h1",
}: FormRendererProps) {
  const [values, setValues] = useState<AnswerValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function change(field: Field, value: AnswerValue) {
    setValues((previous) => ({ ...previous, [field.id]: value }));
    setErrors((previous) => ({ ...previous, [field.id]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = visiblePayload(campos, values);
    const found = nativeErrors(event.currentTarget, zodErrors(campos, payload));
    setGeneral(null);
    if (Object.values(found).some((message) => message !== undefined)) {
      setErrors(found);
      return;
    }
    setBusy(true);
    const outcome = await onSubmit(payload);
    setBusy(false);
    if (!outcome.ok) {
      setErrors(outcome.byField);
      setGeneral(outcome.general);
    }
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <Heading level={headingLevel}>{titulo}</Heading>
        {descripcion !== "" && <p className="text-ink-muted">{descripcion}</p>}
      </header>
      <ErrorSummary campos={campos} errors={errors} general={general} />
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <ul className="space-y-5">
          {campos
            .filter((field) => isFieldVisible(field, campos, values))
            .map((field) => {
              const Component = FIELD_COMPONENTS[field.tipo];
              return (
                <li key={field.id}>
                  <Component
                    field={field}
                    value={values[field.id]}
                    error={errors[field.id]}
                    onChange={(value) => change(field, value)}
                  />
                </li>
              );
            })}
        </ul>
        <button type="submit" className="btn-primary" disabled={busy}>
          {submitLabel}
        </button>
      </form>
    </article>
  );
}
