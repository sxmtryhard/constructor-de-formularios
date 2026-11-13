# Lista de features (FDD)

Esta es la lista de lo que se va a construir, en el orden sugerido. Los requisitos vienen de `docs/enunciado.md` (citado como §N). **Lo que el enunciado no decide no se inventa**: se pregunta a la persona al escribir la especificación de cada feature (skill `write-spec`, carpeta `docs/specs/`). Para empezar, ver `docs/empezar.md`; para saber por dónde vamos, `docs/progreso.md`.

Una feature = **acción + resultado + objeto**, pequeña y con valor visible («Publicar un formulario con un enlace»). Se construyen una por una y la persona aprueba la especificación **antes** de delegar. Las reglas de código están en `AGENTS.md`.

## Qué es el proyecto
Un constructor de formularios dinámicos: una persona (docente o líder de club) crea formularios arrastrando campos, los publica con un enlace y revisa las respuestas, sin programar (§1).

## Roles
- **Creador**: tiene cuenta, crea y administra sus formularios y ve sus respuestas.
- **Respondiente**: cualquiera con el enlace público `/f/[codigo]`; no necesita cuenta.
- El enunciado pide roles como custom claim `rol` (§9.1). Qué roles existen además del creador y cómo se asignan **se decide en F3**.

## Features

Ola = orden de construcción sugerido; cada ola cierra un hito del curso (§16). Quién: quién la usa.

| Id | Feature | Quién | Ola · Hito | Enunciado |
| --- | --- | --- | --- | --- |
| **Base** | | | | |
| F0 | Base del proyecto: errores y HTTP (`manejar`), validación de `Origin`, entorno, clientes de Firebase, límite de frecuencia y puertas de calidad | Sistema | 1 · H1 | §9.2, §9.5 |
| F1 | Generar el esquema Zod de respuestas a partir de la definición de un formulario | Sistema | 1 · H1 | §6, §8, §11 |
| F2 | Renderizar un formulario desde una definición JSON (texto, número, selección), validado y accesible, con carga, vacío y error | Respondiente | 1 · H1 | §4, §5, §16 H1 |
| **Interfaz y navegación** | | | | |
| F3 | Ingresar y salir con correo y contraseña (cookie de sesión, `GET /api/auth/yo`, `proxy.ts`) | Creador | 2 · H2 | §9.1 |
| F4 | Layout base: landmarks, navegación con sesión, «Saltar al contenido», tema, `loading`/`error`/`not-found` | Todos | 2 · H2 | §3, §4, §14.4 |
| F5 | Crear un formulario y listar «Mis formularios» (paginado con cursor) | Creador | 2 · H2 | §3, §9.2 |
| **Constructor** | | | | |
| F6 | Editar los campos de un formulario en el constructor (6 tipos, obligatorio, reglas mín./máx./patrón; `useReducer`) | Creador | 2 · H2 | RF-01, RF-02, §6, §8 |
| F7 | Ordenar y agregar campos arrastrando (con botones subir/bajar como alternativa) | Creador | 2 · H2 | §5 |
| F8 | Mostrar un campo solo si otro vale X (lógica condicional) | Creador · Respondiente | 2 · H2 | RF-03, §11 |
| **Publicación y respuestas** | | | | |
| F9 | Guardar el formulario en Firestore y conservar la versión del esquema al cambiarlo | Creador | 3 · H3 | §9.4, §10 |
| F10 | Publicar un formulario con un enlace y una fecha de cierre | Creador | 3 · H3 | RF-04 |
| F11 | Responder un formulario publicado (`GET /api/f/:codigo`, `POST …/respuestas`; 400, 410, 429) | Respondiente | 3 · H3 | §8, §9.4, §10 |
| F12 | Ver las respuestas en una tabla | Creador | 3 · H3 | RF-05 |
| F13 | Ver el resumen por pregunta (`GET /api/formularios/:id/resumen`) | Creador | 3 · H3 | RF-05, §9.4 |
| F14 | Exportar las respuestas a CSV (con «copiar» como alternativa) | Creador | 3 · H3 | RF-06, §5 |
| **Entrega** | | | | |
| F15 | Documentar la API: `openapi.yaml` y colección Bruno | Sistema | 3 · H3 | §9.6 |
| F16 | Desplegar en Vercel y revisar la seguridad (cabeceras, `npm audit`, lista §16) | Sistema | 4 · H4 | §9.5, §13, §16 |
| F17 | Evidencias de calidad: `calidad/`, `CALIDAD.md` y al menos 3 retos de excelencia | Sistema | 4 · H4 | §14 |
| F18 | Comparar respuestas entre versiones del formulario | Creador | 5 (opcional) | §12 |

## Áreas y carpetas

Cada área agrupa features y tiene su carpeta en `app/features/` (ver `docs/architecture.md`).

| Área | Carpeta | Features |
| --- | --- | --- |
| Sesión y cuentas | `app/features/auth` | F3 |
| Formularios (definición, constructor, publicación) | `app/features/forms` | F1, F2, F5–F10 |
| Respuestas | `app/features/responses` | F11–F14, F18 |
| Transversal | `app/` (páginas), `app/shared/` | F0, F4, F15–F17 |

## F0 · Alcance de la base

F0 es la capa que usan todas las demás: no tiene pantallas. Su especificación debe decidir, con la persona, al menos: cómo se representan y traducen los errores a HTTP con el formato de §9.2, cómo se valida el origen de las peticiones, cómo se conecta el servidor con Firebase (Admin SDK, `FIREBASE_PRIVATE_KEY` con `\n`), cómo se validan las variables de entorno (y un comando `npm run check:env` que muestre estados, nunca valores), cómo se limita la frecuencia (`429`), cómo se registra cada petición con un identificador sin datos personales y cómo se prueba todo sin tocar la red. La sesión (cookie) es F3. Las puertas de calidad (`npm run check`) ya existen: F0 no las reescribe.
