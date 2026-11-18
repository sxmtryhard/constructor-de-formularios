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

## 5 · Retos de excelencia (elegir al menos 3)

| Reto | Estado | Evidencia y cómo reproducir |
| --- | --- | --- |
| Pruebas de accesibilidad de componentes con axe dentro de Vitest y RTL | ⏳ requiere instalar `jsdom`, `@testing-library/*` y `axe-core` (ADR) | `npm test` |
| Prueba en 3 anchos con Playwright y 0 violaciones de axe | ⏳ requiere `@playwright/test` y `@axe-core/playwright` (ADR) | `npx playwright test` |
| 100 en las cuatro categorías de Lighthouse en 3 páginas | ⏳ medir | informes en `calidad/lighthouse/` |

## Cómo reproducir

1. `curl -sI https://constructor-de-formularios.vercel.app/` para ver las cabeceras.
2. DevTools → modo dispositivo, con anchos 360, 768 y 1024. En la consola: `document.documentElement.scrollWidth === innerWidth`.
3. DevTools → Lighthouse (móvil y escritorio) y la extensión axe DevTools en cada página.
4. Pruebas automáticas: `npm run check`.
