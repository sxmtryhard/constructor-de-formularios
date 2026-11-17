"use client";

import Link from "next/link";
import { type ActionDispatch, useEffect, useReducer, useState, useSyncExternalStore } from "react";
import type { ErrorBody } from "@/shared/schema";
import { apiJson, loginUrl } from "@/shared/ui/api";
import { ErrorPanel, LoadingSkeleton } from "@/shared/ui/status";
import { type Field, type FieldType, Form, FormInput, type PublishInput } from "../schema";
import { type BuilderAction, type BuilderState, builderReducer, INITIAL_BUILDER, toFormInput } from "./builder-reducer";
import { FieldEditor } from "./field-editor";
import { FieldPalette } from "./field-palette";
import { FormRenderer, type SubmitOutcome } from "./form-renderer";
import { PublishPanel } from "./publish-panel";

type Dispatch = ActionDispatch<[action: BuilderAction]>;
type Dragging = { kind: "tipo"; tipo: FieldType } | { kind: "campo"; id: string } | null;
type LoadState = { kind: "cargando" } | { kind: "error"; error: ErrorBody; status: number } | { kind: "listo" };

/** Detección de soporte de arrastrar y soltar nativo; en el servidor se asume que no. */
function subscribeNothing() {
  return () => {};
}
function detectDragSupport(): boolean {
  return "draggable" in document.createElement("div");
}
function noDragOnServer(): boolean {
  return false;
}

function DropSlot({ index, onDrop }: { index: number; onDrop: (index: number) => void }) {
  return (
    <li>
      <button
        type="button"
        className="btn-secondary w-full border-dashed text-sm"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDrop(index);
        }}
        onClick={() => onDrop(index)}
      >
        Soltar aquí (posición {index + 1})
      </button>
    </li>
  );
}

interface FieldListProps {
  campos: Field[];
  dispatch: Dispatch;
  dragging: Dragging;
  dragSupported: boolean;
  setDragging: (dragging: Dragging) => void;
}

function FieldList({ campos, dispatch, dragging, dragSupported, setDragging }: FieldListProps) {
  function drop(index: number) {
    if (dragging?.kind === "tipo") {
      dispatch({ type: "agregar", tipo: dragging.tipo, index });
    }
    if (dragging?.kind === "campo") {
      dispatch({ type: "mover-a", id: dragging.id, index });
    }
    setDragging(null);
  }
  if (campos.length === 0 && dragging === null) {
    return <p className="rounded-lg border border-line bg-surface-alt p-6 text-ink-muted">Aún no hay campos.</p>;
  }
  return (
    <ol className="space-y-3">
      {dragging !== null && <DropSlot index={0} onDrop={drop} />}
      {campos.map((field, index) => (
        <FieldItem key={field.id} {...{ field, index, campos, dispatch, dragging, dragSupported, setDragging, drop }} />
      ))}
    </ol>
  );
}

function FieldItem({
  field,
  index,
  campos,
  dispatch,
  dragging,
  dragSupported,
  setDragging,
  drop,
}: Omit<FieldListProps, "campos"> & { field: Field; index: number; campos: Field[]; drop: (index: number) => void }) {
  return (
    <>
      <li>
        <FieldEditor
          field={field}
          index={index}
          total={campos.length}
          previous={campos.slice(0, index)}
          dispatch={dispatch}
          dragSupported={dragSupported}
          onDragStart={(id) => setDragging({ kind: "campo", id })}
          onDragEnd={() => setDragging(null)}
        />
      </li>
      {dragging !== null && <DropSlot index={index + 1} onDrop={drop} />}
    </>
  );
}

function issuesToError(input: FormInput): ErrorBody | null {
  const parsed = FormInput.safeParse(input);
  if (parsed.success) {
    return null;
  }
  return {
    error: "Hay datos que corregir antes de guardar.",
    detalles: parsed.error.issues.map((issue) => ({ campo: issue.path.join("."), mensaje: issue.message })),
  };
}

function DetailsFields({ state, dispatch }: { state: BuilderState; dispatch: Dispatch }) {
  return (
    <section aria-labelledby="titulo-datos" className="space-y-3">
      <h2 id="titulo-datos" className="text-xl font-bold text-primary-strong">
        Datos del formulario
      </h2>
      <p>
        <label htmlFor="titulo" className="mb-1 block font-semibold">
          Título
        </label>
        <input
          id="titulo"
          type="text"
          className="field-input"
          required
          maxLength={150}
          value={state.titulo}
          onChange={(event) => dispatch({ type: "titulo", value: event.target.value })}
        />
      </p>
      <p>
        <label htmlFor="descripcion" className="mb-1 block font-semibold">
          Descripción
        </label>
        <textarea
          id="descripcion"
          rows={3}
          className="field-input"
          maxLength={1000}
          value={state.descripcion}
          onChange={(event) => dispatch({ type: "descripcion", value: event.target.value })}
        />
      </p>
    </section>
  );
}

function Preview({ state }: { state: BuilderState }) {
  const [message, setMessage] = useState("");
  async function check(): Promise<SubmitOutcome> {
    setMessage("Vista previa: las respuestas son válidas (no se envían).");
    return { ok: true };
  }
  return (
    <section aria-labelledby="titulo-vista" className="space-y-3 rounded-lg border-2 border-control-border p-4">
      <h2 id="titulo-vista" className="text-xl font-bold text-primary-strong">
        Vista previa
      </h2>
      <p role="status" className="text-success">
        {message}
      </p>
      <FormRenderer
        key={JSON.stringify(state.campos)}
        titulo={state.titulo}
        descripcion={state.descripcion}
        campos={toFormInput(state).campos}
        submitLabel="Probar validación"
        headingLevel="h3"
        onSubmit={check}
      />
    </section>
  );
}

function useBuilderActions(id: string, state: BuilderState, dispatch: Dispatch, setForm: (form: Form) => void) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<ErrorBody | null>(null);

  async function save(): Promise<boolean> {
    const input = toFormInput(state);
    const invalid = issuesToError(input);
    setError(invalid);
    if (invalid !== null) {
      return false;
    }
    setBusy(true);
    setStatus("Guardando…");
    const result = await apiJson(`/api/formularios/${id}`, Form, "PUT", input);
    setBusy(false);
    if (!result.ok) {
      setStatus("");
      setError(result.error);
      return false;
    }
    setForm(result.data);
    dispatch({ type: "guardado" });
    setStatus(`Guardado (versión ${result.data.version}).`);
    return true;
  }

  async function publish(cierra: string | null) {
    if (!(await save())) {
      return;
    }
    const body: PublishInput = { cierra };
    await runFormAction(`/api/formularios/${id}/publicar`, body, "Formulario publicado.");
  }

  async function runFormAction(url: string, body: object, done: string) {
    setBusy(true);
    const result = await apiJson(url, Form, "POST", body);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(result.data);
    setError(null);
    setStatus(done);
  }

  async function unpublish() {
    await runFormAction(`/api/formularios/${id}/despublicar`, {}, "Formulario despublicado.");
  }

  return { busy, status, error, save, publish, unpublish };
}

function BuilderEditor({
  id,
  form,
  setForm,
  state,
  dispatch,
}: {
  id: string;
  form: Form;
  setForm: (form: Form) => void;
  state: BuilderState;
  dispatch: Dispatch;
}) {
  const [dragging, setDragging] = useState<Dragging>(null);
  const dragSupported = useSyncExternalStore(subscribeNothing, detectDragSupport, noDragOnServer);
  const actions = useBuilderActions(id, state, dispatch, setForm);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <div className="space-y-6">
        <FieldPalette
          total={state.campos.length}
          dragSupported={dragSupported}
          onAdd={(tipo) => dispatch({ type: "agregar", tipo, index: null })}
          onDragStart={(tipo) => setDragging({ kind: "tipo", tipo })}
          onDragEnd={() => setDragging(null)}
        />
        <PublishPanel form={form} busy={actions.busy} onPublish={actions.publish} onUnpublish={actions.unpublish} />
      </div>
      <div className="min-w-0 space-y-6">
        <DetailsFields state={state} dispatch={dispatch} />
        <section aria-labelledby="titulo-campos" className="space-y-3">
          <h2 id="titulo-campos" className="text-xl font-bold text-primary-strong">
            Campos
          </h2>
          <FieldList {...{ campos: state.campos, dispatch, dragging, dragSupported, setDragging }} />
        </section>
        <div className="sticky bottom-0 space-y-2 border-t border-line bg-surface py-3">
          {actions.error !== null && <ErrorPanel error={actions.error} />}
          <p role="status" aria-live="polite" className="font-semibold">
            {actions.status}
            {state.cambiado && " Hay cambios sin guardar."}
          </p>
          <button type="button" className="btn-primary" disabled={actions.busy} onClick={() => void actions.save()}>
            Guardar cambios
          </button>
        </div>
        <Preview state={state} />
      </div>
    </div>
  );
}

export function FormBuilder({ id }: { id: string }) {
  const [state, dispatch] = useReducer(builderReducer, INITIAL_BUILDER);
  const [load, setLoad] = useState<LoadState>({ kind: "cargando" });
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    void apiJson(`/api/formularios/${encodeURIComponent(id)}`, Form).then((result) => {
      if (!result.ok) {
        setLoad({ kind: "error", error: result.error, status: result.status });
        return;
      }
      setForm(result.data);
      dispatch({ type: "cargar", form: result.data });
      setLoad({ kind: "listo" });
    });
  }, [id]);

  return (
    <article aria-labelledby="titulo-editor" className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 id="titulo-editor" className="text-3xl font-bold text-primary-strong">
          Editar formulario
        </h1>
        <nav aria-label="Formulario" className="flex flex-wrap gap-2">
          <Link href="/formularios" className="btn-secondary">
            Volver a mis formularios
          </Link>
          <Link href={`/formularios/${id}/respuestas`} className="btn-secondary">
            Ver respuestas
          </Link>
        </nav>
      </header>
      <BuilderBody {...{ id, load, form, setForm, state, dispatch }} />
    </article>
  );
}

function BuilderBody({
  id,
  load,
  form,
  setForm,
  state,
  dispatch,
}: {
  id: string;
  load: LoadState;
  form: Form | null;
  setForm: (form: Form) => void;
  state: BuilderState;
  dispatch: Dispatch;
}) {
  if (load.kind === "cargando") {
    return <LoadingSkeleton label="Cargando el formulario…" />;
  }
  if (load.kind === "error") {
    let loginHref: string | undefined;
    if (load.status === 401) {
      loginHref = loginUrl(`/formularios/${id}/editar`);
    }
    return <ErrorPanel error={load.error} onRetry={() => window.location.reload()} loginHref={loginHref} />;
  }
  if (form === null) {
    return null;
  }
  return <BuilderEditor id={id} form={form} setForm={setForm} state={state} dispatch={dispatch} />;
}
