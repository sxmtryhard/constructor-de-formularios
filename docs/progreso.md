# Progreso

Lo mantiene el orquestador: se actualiza al cerrar cada feature (spec aprobada → construida → `npm run check:full` en verde → `security` → nota en `docs/handoffs/`). Lo leen Claude Code y OpenCode al empezar la sesión.

## Estado
- **Construido (2026-11-16):** MVP F0–F14 según `docs/specs/F0-F14-mvp.md` (aprobada sin ronda de preguntas a pedido de la persona; las decisiones marcadas «(IA)» están por revisar). API completa, constructor, formulario público, respuestas, resumen y CSV. `npm run check:full` en verde (190 pruebas). Notas en `docs/handoffs/`.
- **Desplegado (2026-11-17):** <https://constructor-de-formularios.vercel.app> con las 7 variables de Firebase en Vercel. Verificado: `/api/auth/yo` → 401 y `/api/f/zzzzzzzzzz` → 404. La persona probó el flujo con sesión en producción (2026-11-17). **Falta rotar la clave privada**, que quedó expuesta en el chat.
- **F15 hecho (2026-11-17):** `openapi.yaml` (10 rutas, todos los códigos de error) y la colección `bruno/` (36 peticiones: sesión, éxito, 400, 401, 403 y 404 por ruta principal). La colección no se ha ejecutado aún contra producción: necesita el correo y la contraseña de la persona.
- **F17, los 3 retos de excelencia (2026-11-17):** la persona eligió estos tres:
  - axe dentro de Vitest y RTL ([ADR-0010](adr/0010-axe-en-vitest.md));
  - navegación accesible (anunciador de rutas);
  - SEO avanzado e impresión.

  Spec en `docs/specs/F17-retos.md` y evidencias en `calidad/CALIDAD.md` §5. Falta el PDF de impresión de las respuestas, que hace la persona.
- **Pruebas 413/415/429 (2026-11-17):** `app/features/responses/tests/limits-routes.test.ts` (13 casos).
- **F17 parcial (2026-11-17):** `calidad/CALIDAD.md` con capturas a 360, 768 y 1024 px de las páginas públicas, cabeceras y TTFB. Faltan Lighthouse, axe, el validador W3C, la revisión manual, las páginas con sesión y elegir los 3 retos.
- **Pruebas de componentes (2026-11-17):** con la autorización de la persona se instalaron `jsdom`, `@vitejs/plugin-react` y `@testing-library/*` ([ADR-0009](adr/0009-pruebas-de-componentes.md)). Las pruebas están en `app/features/forms/tests/form-renderer.test.tsx` y `app/shared/tests/status.test.tsx`.
- **§15:** `ia/README.md` (dónde está cada restricción) e `ia/bitacora.md` (entradas en borrador que debe revisar la persona).

- **Revisión de seguridad (2026-11-16):** corregidos el ReDoS (alta: `isSafePattern` ahora prohíbe repetir grupos y limita a 2 cuantificadores sin tope) y la IP del límite de frecuencia (`ipDe`). Cerrados el 2026-11-17 (nota en `docs/handoffs/backend-seguridad-bajos.md`):
- `id`, `codigo` y `cursor` de la URL se validan con Zod (forma inválida → 404; cursor → 400);
- un documento corrupto da 500 y no 400;
- `exigirOrigen` en `DELETE /api/auth/sesion`;
- al borrar un formulario se borran también sus respuestas y versiones (`recursiveDelete`);
- el límite de frecuencia por instancia quedó documentado (la defensa global es el Firewall de Vercel).

Además, la barra de navegación ya no consulta `/api/auth/yo` sin cookie, así que desaparece el 401 de la consola en las páginas públicas. Sigue abierto: CSP con `'unsafe-inline'`. ~~Actualizar `next`~~ hecho el 2026-11-17: 16.4.3 → 16.4.6 (el build de 16.4.3 se detenía por una vulnerabilidad conocida). Siguen en `npm audit` alertas en herramientas de desarrollo (picomatch y minimatch, vía vite, vitest y eslint) y en `fast-xml-parser` (vía firebase-admin); solo se quitan con `npm audit fix --force`, que trae cambios incompatibles.

## Decisiones tomadas
- 2026-11-13 · Se parte de la plantilla `library_agents_job` y se adapta al enunciado ([ADR-0008](adr/0008-adaptacion-al-enunciado.md), en estado *Propuesta*).
- 2026-11-13 · Finales de línea LF en todo el repositorio (`.gitattributes`): con `core.autocrlf=true` en Windows, Biome rechazaba todos los archivos.
- 2026-11-13 · `tests/project/guard.test.ts` crea el enlace de prueba como *junction*: en Windows un symlink de carpeta exige modo desarrollador.

## Pendientes de la persona
(Cosas que solo ella puede hacer.)
1. **Configuración de IA (§15 del enunciado):** la de la plantilla ya está en el primer commit (`6ea84a7`). Falta revisar `.claude/settings.json`, `.claude/hooks/guard.ts` y `.agents/guard/rules.ts`, adaptarlos a tu criterio, crear la carpeta `ia/` con tus propias pruebas de que las restricciones funcionan (p. ej. pedirle a la IA que lea `.env` y guardar el bloqueo) y empezar la bitácora (`ia/bitacora.md`).
2. Resolver con el docente los puntos ❓ de ADR-0008 y cambiar su estado a *Aceptada*.
3. Node: en local basta Node 22 (Next exige ≥ 20.9 y `npm run check` pasa); Vercel usa 24 por `engines`. Antes de desplegar, probar con la comprobación de ADR-0007.
- 2026-11-13 · `npm audit fix` aplicado. Quedan 14 alertas (13 moderadas, 1 baja) en dependencias de desarrollo y de `firebase-admin`; solo se quitan con `--force` (baja `eslint-config-next` a 15, cambio incompatible). Revisar de nuevo en F16.
4. Firebase: proyecto `constructor-formularios` ya creado (2026-11-13; Spark, Auth correo/contraseña, Firestore `nam5` con reglas que niegan todo, app web registrada). **Falta:** crear el `.env` con la config de la app web y la clave privada de la cuenta de servicio, y decidir en F3 si se desactiva el registro desde el cliente.
5. ~~Primer commit y repositorio en GitHub~~ hecho: <https://github.com/sxmtryhard/constructor-de-formularios> (privado; renombrar a `40-constructor-de-formularios` si el docente lo exige).
6. Abrir una sesión nueva de Claude Code en esta carpeta para que cargue los agentes, y enviar el primer mensaje de `docs/empezar.md` §4.
