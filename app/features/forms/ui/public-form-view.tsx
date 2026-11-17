"use client";

import { useEffect, useState } from "react";
import { SubmitResult } from "@/features/responses/schema";
import type { ErrorBody } from "@/shared/schema";
import { apiJson } from "@/shared/ui/api";
import { ErrorPanel, LoadingSkeleton } from "@/shared/ui/status";
import { type AnswerValue, PublicForm } from "../schema";
import { type FieldErrors, FormRenderer, type SubmitOutcome } from "./form-renderer";

type PublicState =
  | { kind: "cargando" }
  | { kind: "error"; error: ErrorBody }
  | { kind: "no-encontrado" }
  | { kind: "cerrado" }
  | { kind: "listo"; form: PublicForm }
  | { kind: "gracias" };

async function fetchPublicForm(codigo: string): Promise<PublicState> {
  const result = await apiJson(`/api/f/${encodeURIComponent(codigo)}`, PublicForm);
  if (result.ok) {
    return { kind: "listo", form: result.data };
  }
  if (result.status === 404) {
    return { kind: "no-encontrado" };
  }
  if (result.status === 410) {
    return { kind: "cerrado" };
  }
  return { kind: "error", error: result.error };
}

/** Los `detalles` del 400 llegan por campo (`campo` puede venir como `valores.x` o `x`). */
function detailsByField(error: ErrorBody): FieldErrors {
  const byField: FieldErrors = {};
  for (const detail of error.detalles ?? []) {
    const key = detail.campo.replace(/^valores\./, "");
    if (byField[key] === undefined) {
      byField[key] = detail.mensaje;
    }
  }
  return byField;
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <section aria-labelledby="titulo-aviso" className="space-y-3 rounded-lg border border-line bg-surface-alt p-6">
      <h1 id="titulo-aviso" className="text-2xl font-bold text-primary-strong">
        {title}
      </h1>
      <p>{text}</p>
    </section>
  );
}

export function PublicFormView({ codigo }: { codigo: string }) {
  const [state, setState] = useState<PublicState>({ kind: "cargando" });

  useEffect(() => {
    void fetchPublicForm(codigo).then(setState);
  }, [codigo]);

  function reload() {
    setState({ kind: "cargando" });
    void fetchPublicForm(codigo).then(setState);
  }

  async function submit(valores: Record<string, AnswerValue>): Promise<SubmitOutcome> {
    const url = `/api/f/${encodeURIComponent(codigo)}/respuestas`;
    const result = await apiJson(url, SubmitResult, "POST", { valores });
    if (result.ok) {
      setState({ kind: "gracias" });
      return { ok: true };
    }
    if (result.status === 410) {
      setState({ kind: "cerrado" });
      return { ok: true };
    }
    if (result.status === 404) {
      setState({ kind: "no-encontrado" });
      return { ok: true };
    }
    return { ok: false, byField: detailsByField(result.error), general: result.error.error };
  }

  if (state.kind === "cargando") {
    return <LoadingSkeleton label="Cargando el formulario…" />;
  }
  if (state.kind === "error") {
    return <ErrorPanel error={state.error} onRetry={reload} />;
  }
  if (state.kind === "no-encontrado") {
    return <Notice title="Formulario no encontrado" text="El enlace no existe o el formulario ya no está publicado." />;
  }
  if (state.kind === "cerrado") {
    return <Notice title="Formulario cerrado" text="Este formulario ya no recibe respuestas." />;
  }
  if (state.kind === "gracias") {
    return <Notice title="¡Gracias!" text="Tu respuesta se envió correctamente." />;
  }
  return (
    <FormRenderer
      titulo={state.form.titulo}
      descripcion={state.form.descripcion}
      campos={state.form.campos}
      submitLabel="Enviar respuesta"
      onSubmit={submit}
    />
  );
}
