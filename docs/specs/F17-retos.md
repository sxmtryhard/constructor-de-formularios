# F17 · Retos de excelencia (§14.5)

- **Estado:** Aprobada. La persona eligió estos 3 retos el 2026-11-17; los detalles marcados «(IA)» los propuso el asistente.
- **Áreas:** layout y páginas (frontend), `app/shared/ui` y pruebas.

## Reto 1 · SEO avanzado e impresión
- `app/sitemap.ts`: lista solo las páginas públicas e indexables, `/` y `/login`. No incluye los formularios publicados (IA): son de cada creador y no se deben descubrir por buscadores.
- `app/robots.ts`: permite `/` y `/login`; bloquea `/api/`, `/formularios` y `/f/` (IA: los enlaces públicos de respuesta no se indexan). Enlaza el sitemap.
- La URL base sale de `NEXT_PUBLIC_SITE_URL` si existe; si no, `https://constructor-de-formularios.vercel.app` (IA).
- Metadatos en `app/layout.tsx`:
  - `metadataBase`;
  - Open Graph (`type: website`, `locale: es_CO`, título y descripción);
  - `robots` por defecto;
  - las páginas `/f/[codigo]` y `/formularios/**` usan `noindex`.
- JSON-LD en la página de inicio: un objeto `WebApplication` con nombre, descripción, URL, `applicationCategory` e `inLanguage: "es"`. Se inserta como `<script type="application/ld+json">` con `JSON.stringify` y escapando `<`. Es contenido fijo, no viene de usuarios.
- `@media print` en `app/globals.css`:
  - oculta la navegación, el pie, los botones y el enlace «Saltar al contenido»;
  - texto negro sobre blanco y la tabla de respuestas con bordes;
  - muestra la URL de los enlaces del contenido;
  - evita cortar una fila de tabla entre páginas.

**Criterio:** `GET /sitemap.xml` y `GET /robots.txt` responden 200 con el contenido descrito. El HTML de `/` contiene `application/ld+json` y `og:title`. Al imprimir `/formularios/[id]/respuestas` solo sale el contenido.

## Reto 2 · Navegación accesible
- En cada cambio de ruta del lado del cliente (no en la carga inicial), el foco va al `<h1>` de la página nueva, al que se pone `tabIndex={-1}` sin borde de foco extra. Si no hay `<h1>`, va a `<main>`.
- Un anunciador `aria-live="polite"` (`role="status"`, visualmente oculto pero leído por lectores de pantalla) dice «Página: <título del documento>» tras cada cambio de ruta.
- Se implementa como componente de cliente en `app/shared/ui/route-announcer.tsx`, montado una vez en el layout, usando `usePathname`. Respeta `prefers-reduced-motion`: no hay animación.

**Criterio:** al navegar de `/` a `/login` con un enlace, `document.activeElement` es el `h1` «Ingresar» y el anunciador contiene «Página: Ingresar · Constructor de formularios».

## Reto 3 · Accesibilidad de componentes con axe en Vitest
- Dependencia de desarrollo `axe-core` ([ADR-0010](../adr/0010-axe-en-vitest.md)).
- Ayudante `tests/helpers/axe.ts`: corre axe sobre el contenedor de RTL y devuelve las violaciones. En jsdom no se mide el contraste de color (no calcula estilos); el contraste ya lo cubren `tests/project/palette-contrast.test.ts` y Lighthouse.
- Pruebas: 0 violaciones en `FormRenderer` con los 6 tipos de campo, en el estado con errores de validación visibles, en `ErrorPanel`, en `LoadingSkeleton` y en el anunciador de rutas.

**Criterio:** `npm test` incluye estas pruebas y pasan.

## Fuera de alcance
Imágenes Open Graph generadas, `next/og`, multidioma.
