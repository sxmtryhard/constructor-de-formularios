"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { ErrorBody } from "@/shared/schema";
import { apiEmpty, apiJson, loginUrl } from "@/shared/ui/api";
import { ErrorPanel, LoadingSkeleton } from "@/shared/ui/status";
import { Form, type FormInput, FormList } from "../schema";

type ListState =
  | { kind: "cargando" }
  | { kind: "error"; error: ErrorBody; status: number }
  | { kind: "listo"; items: Form[] };

const NEW_FORM: FormInput = { titulo: "Formulario sin título", descripcion: "", campos: [] };

type FormStatus = "borrador" | "publicado" | "cerrado";

const STATUS_LABEL: Record<FormStatus, { text: string; className: string }> = {
  borrador: { text: "Borrador", className: "border-control-border text-ink-muted" },
  publicado: { text: "Publicado", className: "border-success text-success" },
  cerrado: { text: "Cerrado", className: "border-warning text-warning" },
};

function formStatus(form: Form, nowMs: number): FormStatus {
  if (!form.publicado) {
    return "borrador";
  }
  if (form.cierra !== null && Date.parse(form.cierra) <= nowMs) {
    return "cerrado";
  }
  return "publicado";
}

async function fetchForms(): Promise<ListState> {
  const result = await apiJson("/api/formularios?limite=100", FormList);
  if (!result.ok) {
    return { kind: "error", error: result.error, status: result.status };
  }
  return { kind: "listo", items: result.data.items };
}

function FormCard({ form, nowMs, onDelete }: { form: Form; nowMs: number; onDelete: (form: Form) => void }) {
  const status = STATUS_LABEL[formStatus(form, nowMs)];
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface-alt p-4">
      <h2 className="text-lg font-semibold text-primary-strong">{form.titulo}</h2>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-ink-muted">Estado</dt>
        <dd>
          <strong className={`rounded border-2 px-2 py-0.5 ${status.className}`}>{status.text}</strong>
        </dd>
        <dt className="text-ink-muted">Respuestas</dt>
        <dd>{form.total_respuestas}</dd>
        <dt className="text-ink-muted">Campos</dt>
        <dd>{form.campos.length}</dd>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={`/formularios/${form.id}/editar`} className="btn-primary">
          Editar <strong className="sr-only">{form.titulo}</strong>
        </Link>
        <Link href={`/formularios/${form.id}/respuestas`} className="btn-secondary">
          Respuestas <strong className="sr-only">de {form.titulo}</strong>
        </Link>
        <button type="button" className="btn-danger" onClick={() => onDelete(form)}>
          Borrar <strong className="sr-only">{form.titulo}</strong>
        </button>
      </div>
    </article>
  );
}

function DeleteDialog({
  dialogRef,
  target,
  onConfirm,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  target: Form | null;
  onConfirm: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-borrar"
      className="m-auto max-w-md rounded-lg border-2 border-control-border bg-surface p-6 text-ink"
    >
      <h2 id="titulo-borrar" className="text-xl font-bold text-primary-strong">
        ¿Borrar el formulario?
      </h2>
      <p className="mt-2">
        Se borrará <strong>{target?.titulo}</strong>. Esta acción no se puede deshacer.
      </p>
      <form method="dialog" className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className="btn-secondary">
          Cancelar
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          Sí, borrar
        </button>
      </form>
    </dialog>
  );
}

export function FormListView() {
  const router = useRouter();
  const [state, setState] = useState<ListState>({ kind: "cargando" });
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Form | null>(null);
  const [nowMs] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    void fetchForms().then(setState);
  }, []);

  function reload() {
    setState({ kind: "cargando" });
    void fetchForms().then(setState);
  }

  async function createForm() {
    setMessage("Creando formulario…");
    const result = await apiJson("/api/formularios", Form, "POST", NEW_FORM);
    if (!result.ok) {
      setMessage(`Error: ${result.error.error}`);
      return;
    }
    router.push(`/formularios/${result.data.id}/editar`);
  }

  function askDelete(form: Form) {
    setTarget(form);
    dialogRef.current?.showModal();
  }

  async function confirmDelete() {
    dialogRef.current?.close();
    if (target === null) {
      return;
    }
    const result = await apiEmpty(`/api/formularios/${target.id}`, "DELETE");
    if (!result.ok) {
      setMessage(`Error al borrar: ${result.error.error}`);
      return;
    }
    setMessage(`Se borró «${target.titulo}».`);
    setTarget(null);
    reload();
  }

  return (
    <section aria-labelledby="titulo-lista" className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 id="titulo-lista" className="text-3xl font-bold text-primary-strong">
          Mis formularios
        </h1>
        <button type="button" className="btn-primary" onClick={createForm}>
          Nuevo formulario
        </button>
      </div>
      <p role="status" aria-live="polite" className="font-semibold">
        {message}
      </p>
      <ListBody state={state} nowMs={nowMs} onRetry={reload} onDelete={askDelete} />
      <DeleteDialog dialogRef={dialogRef} target={target} onConfirm={confirmDelete} />
    </section>
  );
}

function ListBody({
  state,
  nowMs,
  onRetry,
  onDelete,
}: {
  state: ListState;
  nowMs: number;
  onRetry: () => void;
  onDelete: (form: Form) => void;
}) {
  if (state.kind === "cargando") {
    return <LoadingSkeleton label="Cargando tus formularios…" />;
  }
  if (state.kind === "error") {
    let loginHref: string | undefined;
    if (state.status === 401) {
      loginHref = loginUrl("/formularios");
    }
    return <ErrorPanel error={state.error} onRetry={onRetry} loginHref={loginHref} />;
  }
  if (state.items.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface-alt p-6 text-ink-muted">
        Todavía no tienes formularios. Pulsa «Nuevo formulario» para crear el primero.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {state.items.map((form) => (
        <li key={form.id}>
          <FormCard form={form} nowMs={nowMs} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
