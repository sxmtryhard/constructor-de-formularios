import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/shared/ui/site";

/** JSON-LD fijo (no viene de usuarios); se escapa `<` para que no pueda cerrar el `<script>` (F17 · Reto 1). */
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: `${SITE_URL}/`,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "es",
}).replace(/</g, "\\u003c");

const STEPS: string[] = [
  "Crea un formulario y agrega campos arrastrándolos desde la paleta (o con el botón «Agregar»).",
  "Define reglas: obligatorio, mínimos y máximos, patrón y condiciones «Mostrar si».",
  "Publícalo con un enlace y, si quieres, una fecha de cierre.",
  "Revisa las respuestas en una tabla, mira el resumen por pregunta y exporta a CSV.",
];

export default function HomePage() {
  return (
    <article className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <header className="rounded-lg bg-primary-strong p-6 text-surface md:p-10">
        <h1 className="text-3xl font-bold md:text-4xl">Constructor de formularios</h1>
        <p className="mt-4 max-w-3xl text-lg">
          Arma encuestas e inscripciones para tu clase o tu club sin escribir código, compártelas con un enlace y revisa
          las respuestas en un solo lugar.
        </p>
      </header>
      <section aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-2xl font-bold text-primary-strong">
          Cómo funciona
        </h2>
        <ol className="mt-4 grid list-decimal gap-3 pl-6 md:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <p>
        <Link href="/formularios" className="btn-primary">
          Ir a mis formularios
        </Link>
      </p>
    </article>
  );
}
