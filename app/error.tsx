"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" aria-labelledby="titulo-error" className="space-y-4">
      <h1 id="titulo-error" className="text-2xl font-bold text-danger">
        Algo salió mal
      </h1>
      <p>Ocurrió un error inesperado al mostrar esta página.</p>
      <button type="button" onClick={reset} className="btn-primary">
        Reintentar
      </button>
    </section>
  );
}
