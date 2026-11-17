import Link from "next/link";

export default function NotFound() {
  return (
    <section aria-labelledby="titulo-404" className="space-y-4">
      <h1 id="titulo-404" className="text-2xl font-bold text-primary-strong">
        Página no encontrada
      </h1>
      <p>La dirección no existe o ya no está disponible.</p>
      <p>
        <Link href="/" className="link">
          Volver al inicio
        </Link>
      </p>
    </section>
  );
}
