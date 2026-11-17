import type { FormSummary, QuestionSummary } from "../schema";

function percent(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((count / total) * 100);
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return value.toLocaleString("es", { maximumFractionDigits: 2 });
}

function Counts({ question }: { question: QuestionSummary }) {
  if (question.conteos === null) {
    return null;
  }
  return (
    <ul className="space-y-2">
      {question.conteos.map((count) => {
        const pct = percent(count.cantidad, question.respondidas);
        return (
          <li key={count.opcion} className="space-y-1">
            <p className="flex justify-between gap-2 text-sm">
              <strong className="break-words">{count.opcion}</strong>
              <em className="not-italic text-ink-muted">
                {count.cantidad} ({pct} %)
              </em>
            </p>
            <div aria-hidden="true" className="h-3 rounded bg-surface-strong">
              <div className="h-3 rounded bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Stats({ question }: { question: QuestionSummary }) {
  if (question.promedio === null && question.minimo === null && question.maximo === null) {
    return null;
  }
  return (
    <dl className="grid grid-cols-3 gap-2 text-sm">
      <div>
        <dt className="text-ink-muted">Promedio</dt>
        <dd className="font-semibold">{formatNumber(question.promedio)}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">Mínimo</dt>
        <dd className="font-semibold">{formatNumber(question.minimo)}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">Máximo</dt>
        <dd className="font-semibold">{formatNumber(question.maximo)}</dd>
      </div>
    </dl>
  );
}

export function SummaryView({ summary }: { summary: FormSummary }) {
  return (
    <section aria-labelledby="titulo-resumen" className="space-y-3">
      <h2 id="titulo-resumen" className="text-xl font-bold text-primary-strong">
        Resumen por pregunta
      </h2>
      <p className="text-ink-muted">
        {summary.total} respuestas en total · versión vigente {summary.version}.
      </p>
      <ul className="grid gap-4 md:grid-cols-2">
        {summary.preguntas.map((question) => (
          <li key={question.campo_id}>
            <article className="h-full space-y-3 rounded-lg border border-line bg-surface-alt p-4">
              <h3 className="font-semibold text-primary-strong">{question.etiqueta}</h3>
              <p className="text-sm text-ink-muted">{question.respondidas} respondieron esta pregunta.</p>
              <Counts question={question} />
              <Stats question={question} />
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
