"use client";

import { useState } from "react";
import type { Form } from "../schema";

interface PublishPanelProps {
  form: Form;
  busy: boolean;
  onPublish: (cierra: string | null) => void;
  onUnpublish: () => void;
}

/** `datetime-local` (hora local, sin zona) → ISO 8601 UTC. Vacío = sin fecha de cierre. */
function toIsoUtc(local: string): string | null {
  if (local === "") {
    return null;
  }
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function ClosingDate({ cierra }: { cierra: string | null }) {
  if (cierra === null) {
    return <p>Sin fecha de cierre.</p>;
  }
  return (
    <p>
      Cierra el <time dateTime={cierra}>{new Date(cierra).toLocaleString("es")}</time>.
    </p>
  );
}

function PublicLink({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState("");
  const path = `/f/${codigo}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    if (navigator.clipboard === undefined) {
      setCopied(`Copia el enlace a mano: ${url}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied("Enlace copiado.");
    } catch {
      setCopied(`No se pudo copiar. Copia el enlace a mano: ${url}`);
    }
  }

  return (
    <div className="space-y-2">
      <p>
        Enlace público:{" "}
        <a href={path} className="link break-all" target="_blank" rel="noreferrer">
          {path}
        </a>
      </p>
      <button type="button" className="btn-secondary" onClick={copy}>
        Copiar enlace
      </button>
      <p role="status" aria-live="polite" className="text-sm text-success">
        {copied}
      </p>
    </div>
  );
}

export function PublishPanel({ form, busy, onPublish, onUnpublish }: PublishPanelProps) {
  const [closing, setClosing] = useState("");
  return (
    <section aria-labelledby="titulo-publicar" className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <h2 id="titulo-publicar" className="text-xl font-bold text-primary-strong">
        Publicar
      </h2>
      {form.publicado && (
        <>
          <p>
            <strong className="text-success">Publicado</strong> (versión {form.version}).
          </p>
          <ClosingDate cierra={form.cierra} />
        </>
      )}
      {form.publicado && form.codigo !== null && <PublicLink codigo={form.codigo} />}
      {!form.publicado && <p className="text-ink-muted">Borrador: nadie puede responderlo todavía.</p>}
      <p>
        <label htmlFor="cierra" className="mb-1 block text-sm font-semibold">
          Fecha de cierre (opcional, hora local)
        </label>
        <input
          id="cierra"
          type="datetime-local"
          className="field-input"
          value={closing}
          onChange={(event) => setClosing(event.target.value)}
        />
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => onPublish(toIsoUtc(closing))}>
          Guardar y publicar
        </button>
        {form.publicado && (
          <button type="button" className="btn-secondary" disabled={busy} onClick={onUnpublish}>
            Despublicar
          </button>
        )}
      </div>
    </section>
  );
}
