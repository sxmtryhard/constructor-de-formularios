"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Form } from "@/features/forms/schema";
import type { ErrorBody } from "@/shared/schema";
import { type ApiResult, apiJson, loginUrl } from "@/shared/ui/api";
import { ErrorPanel, LoadingSkeleton } from "@/shared/ui/status";
import { FormSummary, type ResponseItem, ResponseList } from "../schema";
import { buildColumns, buildCsv, type Column, formatValue, mergeVersions } from "./csv";
import { SummaryView } from "./summary-view";

const PAGE_SIZE = 20;
const CSV_PAGE_SIZE = 100;
const CSV_MAX_PAGES = 50;

interface Loaded {
  titulo: string;
  items: ResponseItem[];
  versiones: ResponseList["versiones"];
  cursor: string | null;
  summary: FormSummary;
}

type ViewState =
  | { kind: "cargando" }
  | { kind: "error"; error: ErrorBody; status: number }
  | { kind: "listo"; data: Loaded };

function pageUrl(id: string, limit: number, cursor: string | null): string {
  const params = new URLSearchParams({ limite: String(limit) });
  if (cursor !== null) {
    params.set("cursor", cursor);
  }
  return `/api/formularios/${encodeURIComponent(id)}/respuestas?${params.toString()}`;
}

async function loadAll(id: string): Promise<ViewState> {
  const base = `/api/formularios/${encodeURIComponent(id)}`;
  const [form, page, summary] = await Promise.all([
    apiJson(base, Form),
    apiJson(pageUrl(id, PAGE_SIZE, null), ResponseList),
    apiJson(`${base}/resumen`, FormSummary),
  ]);
  for (const result of [form, page, summary]) {
    if (!result.ok) {
      return { kind: "error", error: result.error, status: result.status };
    }
  }
  if (!form.ok || !page.ok || !summary.ok) {
    return { kind: "cargando" };
  }
  const data: Loaded = {
    titulo: form.data.titulo,
    items: page.data.items,
    versiones: page.data.versiones,
    cursor: page.data.siguiente_cursor,
    summary: summary.data,
  };
  return { kind: "listo", data };
}

/** El CSV usa todas las páginas (hasta 5000 respuestas). */
async function fetchEveryResponse(
  id: string,
): Promise<{ items: ResponseItem[]; versiones: ResponseList["versiones"] } | ErrorBody> {
  let items: ResponseItem[] = [];
  let versiones: ResponseList["versiones"] = [];
  let cursor: string | null = null;
  for (let page = 0; page < CSV_MAX_PAGES; page += 1) {
    const result: ApiResult<ResponseList> = await apiJson(pageUrl(id, CSV_PAGE_SIZE, cursor), ResponseList);
    if (!result.ok) {
      return result.error;
    }
    items = [...items, ...result.data.items];
    versiones = mergeVersions(versiones, result.data.versiones);
    cursor = result.data.siguiente_cursor;
    if (cursor === null) {
      break;
    }
  }
  return { items, versiones };
}

function subscribeNothing() {
  return () => {};
}
function canDownload(): boolean {
  return (
    typeof Blob !== "undefined" &&
    typeof URL.createObjectURL === "function" &&
    "download" in document.createElement("a")
  );
}
function noDownloadOnServer(): boolean {
  return false;
}

function downloadCsv(csv: string, name: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CsvExport({ id }: { id: string }) {
  const downloadable = useSyncExternalStore(subscribeNothing, canDownload, noDownloadOnServer);
  const [status, setStatus] = useState("");

  async function exportCsv(mode: "descargar" | "copiar") {
    setStatus("Preparando el CSV…");
    const all = await fetchEveryResponse(id);
    if ("error" in all) {
      setStatus(`Error: ${all.error}`);
      return;
    }
    const csv = buildCsv(buildColumns(all.versiones), all.items);
    if (mode === "descargar") {
      downloadCsv(csv, `respuestas-${id}.csv`);
      setStatus(`CSV descargado con ${all.items.length} respuestas.`);
      return;
    }
    if (navigator.clipboard === undefined) {
      setStatus("Este navegador no permite copiar ni descargar el CSV.");
      return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      setStatus(`CSV copiado (${all.items.length} respuestas).`);
    } catch {
      setStatus("No se pudo copiar el CSV.");
    }
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      {downloadable && (
        <button type="button" className="btn-primary" onClick={() => void exportCsv("descargar")}>
          Descargar CSV
        </button>
      )}
      <button type="button" className="btn-secondary" onClick={() => void exportCsv("copiar")}>
        Copiar CSV
      </button>
      <p role="status" aria-live="polite" className="text-sm font-semibold">
        {status}
      </p>
    </div>
  );
}

function ResponsesTable({ titulo, columns, items }: { titulo: string; columns: Column[]; items: ResponseItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-line bg-surface-alt p-6 text-ink-muted">Aún no hay respuestas.</p>;
  }
  return (
    <section aria-labelledby="caption-respuestas" className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption id="caption-respuestas" className="p-3 text-left font-semibold">
          Respuestas de «{titulo}» ({items.length} cargadas)
        </caption>
        <thead className="bg-surface-strong">
          <tr>
            <th scope="col" className="p-3">
              Fecha
            </th>
            <th scope="col" className="p-3">
              Versión
            </th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="p-3">
                {column.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-line even:bg-surface-alt">
              <th scope="row" className="p-3 font-normal">
                <time dateTime={item.respondido_en}>{new Date(item.respondido_en).toLocaleString("es")}</time>
              </th>
              <td className="p-3">{item.version}</td>
              {columns.map((column) => (
                <td key={column.id} className="max-w-xs break-words p-3">
                  {formatValue(item.valores[column.id])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function LoadedResponses({ id, data, setData }: { id: string; data: Loaded; setData: (data: Loaded) => void }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<ErrorBody | null>(null);

  async function loadMore() {
    setLoadingMore(true);
    const result = await apiJson(pageUrl(id, PAGE_SIZE, data.cursor), ResponseList);
    setLoadingMore(false);
    if (!result.ok) {
      setMoreError(result.error);
      return;
    }
    setMoreError(null);
    setData({
      ...data,
      items: [...data.items, ...result.data.items],
      versiones: mergeVersions(data.versiones, result.data.versiones),
      cursor: result.data.siguiente_cursor,
    });
  }

  return (
    <>
      <SummaryView summary={data.summary} />
      <section aria-labelledby="titulo-tabla" className="space-y-3">
        <h2 id="titulo-tabla" className="text-xl font-bold text-primary-strong">
          Todas las respuestas
        </h2>
        <CsvExport id={id} />
        <ResponsesTable titulo={data.titulo} columns={buildColumns(data.versiones)} items={data.items} />
        {moreError !== null && <ErrorPanel error={moreError} onRetry={() => void loadMore()} />}
        {data.cursor !== null && (
          <button type="button" className="btn-secondary" disabled={loadingMore} onClick={() => void loadMore()}>
            Cargar más
          </button>
        )}
      </section>
    </>
  );
}

export function ResponsesView({ id }: { id: string }) {
  const [state, setState] = useState<ViewState>({ kind: "cargando" });

  useEffect(() => {
    void loadAll(id).then(setState);
  }, [id]);

  function reload() {
    setState({ kind: "cargando" });
    void loadAll(id).then(setState);
  }

  return (
    <article aria-labelledby="titulo-respuestas" className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 id="titulo-respuestas" className="text-3xl font-bold text-primary-strong">
          Respuestas
        </h1>
        <nav aria-label="Formulario" className="flex flex-wrap gap-2">
          <Link href="/formularios" className="btn-secondary">
            Volver a mis formularios
          </Link>
          <Link href={`/formularios/${id}/editar`} className="btn-secondary">
            Editar formulario
          </Link>
        </nav>
      </header>
      <ViewBody id={id} state={state} onRetry={reload} setData={(data) => setState({ kind: "listo", data })} />
    </article>
  );
}

function ViewBody({
  id,
  state,
  onRetry,
  setData,
}: {
  id: string;
  state: ViewState;
  onRetry: () => void;
  setData: (data: Loaded) => void;
}) {
  if (state.kind === "cargando") {
    return <LoadingSkeleton label="Cargando respuestas…" />;
  }
  if (state.kind === "error") {
    let loginHref: string | undefined;
    if (state.status === 401) {
      loginHref = loginUrl(`/formularios/${id}/respuestas`);
    }
    return <ErrorPanel error={state.error} onRetry={onRetry} loginHref={loginHref} />;
  }
  return <LoadedResponses id={id} data={state.data} setData={setData} />;
}
