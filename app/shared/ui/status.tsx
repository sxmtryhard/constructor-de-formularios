import Link from "next/link";
import type { ErrorBody } from "../schema";

/** Esqueleto de carga accesible: el texto lo anuncia `role="status"`, las barras son decorativas. */
export function LoadingSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <section aria-busy="true" className="space-y-3">
      <p role="status" className="text-ink-muted">
        {label}
      </p>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="h-16 animate-pulse rounded-lg bg-surface-strong" />
      ))}
    </section>
  );
}

interface ErrorPanelProps {
  error: ErrorBody;
  onRetry?: () => void;
  loginHref?: string;
}

/** Mensaje de error con reintento opcional y, si la sesión falló, enlace para ingresar. */
export function ErrorPanel({ error, onRetry, loginHref }: ErrorPanelProps) {
  return (
    <section role="alert" className="rounded-lg border-2 border-danger bg-surface p-4">
      <p className="font-semibold text-danger">Error: {error.error}</p>
      {error.detalles !== undefined && error.detalles.length > 0 && (
        <ul className="mt-2 list-disc pl-6 text-danger">
          {error.detalles.map((detail) => (
            <li key={`${detail.campo}-${detail.mensaje}`}>
              <strong>{detail.campo}</strong>: {detail.mensaje}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {onRetry !== undefined && (
          <button type="button" onClick={onRetry} className="btn-secondary">
            Reintentar
          </button>
        )}
        {loginHref !== undefined && (
          <Link href={loginHref} className="btn-primary">
            Ingresar
          </Link>
        )}
      </div>
    </section>
  );
}
