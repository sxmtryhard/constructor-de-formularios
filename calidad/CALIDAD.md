# Evidencias de calidad (enunciado §14)

Producción: <https://constructor-de-formularios.vercel.app>

Leyenda: ✅ verificado (con fecha y cómo) · ⏳ pendiente (lo hace la persona; ver «Cómo reproducir»).

## 1 · Responsive: 360 · 768 · 1024 px

Comprobado el 2026-11-17 en producción con el navegador integrado (vista de dispositivo emulada). Para cada página se midió `document.documentElement.scrollWidth` contra `innerWidth`: si son iguales, no hay desplazamiento horizontal.

| Página | 360 px | 768 px | 1024 px | Capturas |
| --- | --- | --- | --- | --- |
| `/` (inicio) | ✅ 360 = 360 | ✅ 768 = 768 | ✅ 1024 = 1024 | `capturas/{360,768,1024}-inicio.jpg` |
| `/login` | ✅ | ✅ | ✅ | `capturas/{360,768,1024}-login.jpg` |
| `/f/[codigo]` (formulario público) | ✅ | ✅ | ✅ | `capturas/*-formulario-cargando.jpg` (esqueleto de carga), `capturas/360-formulario-no-encontrado.jpg` (estado de error) |
| `/formularios`, editor, respuestas (con sesión) | ⏳ | ⏳ | ⏳ | — |

Observado en las capturas:
- 360 px: una columna, navegación visible, botones a todo el ancho.
- 768 px: los pasos de «Cómo funciona» pasan a dos columnas y los botones del inicio de sesión quedan en fila.
- 1024 px: la navegación está completa y el contenido tiene un ancho máximo.

⏳ Falta:
- capturas de las páginas con sesión;
- zoom al 200 %;
- reflow a 320 px.

## 2 · Accesibilidad y HTML semántico

✅ Comprobado el 2026-11-17 con JavaScript en las páginas públicas:
- `lang="es"`;
- un solo `<h1>` por página;
- `<title>` distinto en cada ruta («Ingresar · …», «Responder formulario · …»);
- 0 campos sin `<label>` en `/login`.

✅ En el código:
- landmarks `header`, `nav`, `main` y `footer` en `app/layout.tsx`;
- enlace «Saltar al contenido» (`app/layout.tsx`, estilos en `app/globals.css`);
- `prefers-reduced-motion` en `app/globals.css`;
- errores junto al campo con `aria-describedby` en `app/features/forms/ui/field-inputs.tsx`, anunciados con `aria-live`/`role="alert"` en `form-renderer.tsx` y `app/shared/ui/status.tsx`;
- contraste de la paleta comprobado por prueba automática (`tests/helpers/contrast.ts` y las pruebas del proyecto).

⏳ Falta la revisión manual, con fecha:

| Comprobación | Resultado | Fecha |
| --- | --- | --- |
| Recorrido solo con teclado (Tab/Shift+Tab/Enter/Espacio) en login, editor y formulario público | | |
| Foco siempre visible y no tapado | | |
| Zoom 200 % sin perder contenido | | |
| Lector de pantalla (NVDA): etiquetas y errores se leen | | |
| axe DevTools: 0 violaciones en 3 páginas | | |
| Validador W3C (<https://validator.w3.org/nu/>) sin errores | | |

## 3 · Seguridad (cabeceras en producción)

✅ Comprobado el 2026-11-17 con `curl -sI https://constructor-de-formularios.vercel.app/`:
- `Content-Security-Policy` (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`…);
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Strict-Transport-Security`;
- `X-Frame-Options: DENY`.

La CSP aún permite `'unsafe-inline'` en `script-src` (lo necesita Next sin *nonces*); está anotado en `docs/progreso.md`.

## 4 · Rendimiento y Core Web Vitals

✅ Medido el 2026-11-17 con `curl` en producción:
- HTML de `/`: 12,7 kB;
- TTFB 0,33 s, por debajo de la meta orientativa de 0,8 s.

✅ `/f/[codigo]` con la pestaña al frente: la petición a la API sale a los 0,46 s de la navegación y responde en unos 0,2 s.

⏳ Tabla para completar con Lighthouse móvil (DevTools → Lighthouse → *Mobile*, en modo incógnito):

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` (pública) | | | | | | | |
| `/f/[codigo]` (con formulario) | | | | | | | |
| `/formularios` (con sesión) | | | | | | | |

Guarde cada informe como HTML en `calidad/lighthouse/` (móvil y escritorio). INP se mide interactuando con la página: DevTools → Performance → *Live metrics*.

Mejoras ya aplicadas para estas métricas:
- páginas de servidor por defecto, con `"use client"` solo donde hay estado;
- sin imágenes pesadas;
- fuentes del sistema;
- esqueletos de carga con altura fija, para que no se mueva el diseño.

Observación pendiente: en las páginas públicas, el navegador registra un `401` en la consola porque la barra de navegación consulta `/api/auth/yo` sin sesión. Lighthouse puede bajar «Buenas prácticas» por esos errores de consola.

## 5 · Retos de excelencia

La persona eligió estos tres el 2026-11-17. Su spec es [`docs/specs/F17-retos.md`](../docs/specs/F17-retos.md).

### Reto A · Pruebas de accesibilidad de componentes con axe dentro de Vitest y RTL
- **Qué es:** `axe-core` se ejecuta sobre los componentes renderizados con React Testing Library ([ADR-0010](../docs/adr/0010-axe-en-vitest.md)). El ayudante está en `tests/helpers/axe.ts`.
- **Casos con 0 violaciones:**
  - `FormRenderer` con los 6 tipos de campo, también con todos obligatorios;
  - `FormRenderer` con los errores de validación visibles;
  - `ErrorPanel`;
  - `LoadingSkeleton`;
  - el anunciador de rutas.
- **Límite:** jsdom no calcula estilos, así que el contraste lo cubren `tests/project/palette-contrast.test.ts` y Lighthouse.
- **Reproducir:** `npx vitest run app/features/forms/tests/form-renderer.a11y.test.tsx app/shared/tests/status.a11y.test.tsx app/shared/tests/route-announcer.test.tsx`
- **Comprobado que detecta fallos:** un componente con un campo sin etiqueta y un botón vacío sí produce violaciones.

### Reto B · Navegación accesible: foco y título anunciados en cada cambio de ruta
- **Qué es:** `app/shared/ui/route-announcer.tsx`, montado una vez en `app/layout.tsx`. En cada navegación del lado del cliente mueve el foco al `<h1>` de la página nueva (o a `<main>`) y anuncia «Página: <título>» en una región `aria-live="polite"`. En la carga inicial no hace nada.
- **Evidencia automática:** `app/shared/tests/route-announcer.test.tsx`.
- **Reproducir en vivo:** abre `/`, pulsa el enlace «Ingresar» de la navegación y, en la consola, ejecuta `document.activeElement.textContent` (debe dar «Ingresar»). Con NVDA se oye «Página: Ingresar · Constructor de formularios».

### Reto C · SEO avanzado e impresión
- **SEO:**
  - `app/sitemap.ts` genera `/sitemap.xml` con `/` y `/login`;
  - `app/robots.ts` genera `/robots.txt`, que bloquea `/api/`, `/formularios` y `/f/`;
  - Open Graph y `metadataBase` en el layout;
  - `noindex` en `/f/**` y `/formularios/**`;
  - JSON-LD `WebApplication` en la página de inicio.
- **Impresión:** `@media print` en `app/globals.css`. Oculta la navegación, el pie y los botones, imprime negro sobre blanco, pone bordes en la tabla y no corta las filas entre páginas.
- **Reproducir:**
  - `curl https://constructor-de-formularios.vercel.app/robots.txt`
  - `curl https://constructor-de-formularios.vercel.app/sitemap.xml`
  - Validar el JSON-LD de `/` en <https://validator.schema.org/>.
  - En `/formularios/[id]/respuestas`, pulsar Ctrl+P y guardar la vista previa como PDF en `calidad/impresion-respuestas.pdf` (⏳ lo hace la persona, porque necesita sesión).

## Cómo reproducir

1. `curl -sI https://constructor-de-formularios.vercel.app/` para ver las cabeceras.
2. DevTools → modo dispositivo, con anchos 360, 768 y 1024. En la consola: `document.documentElement.scrollWidth === innerWidth`.
3. DevTools → Lighthouse (móvil y escritorio) y la extensión axe DevTools en cada página.
4. Pruebas automáticas: `npm run check`.
