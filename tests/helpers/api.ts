import { NextRequest } from "next/server";
import { createFormsService, type FormsService } from "@/features/forms/server/forms-service";
import { MemoryFormsRepository } from "@/features/forms/server/repository.memory";
import { MemoryResponsesRepository } from "@/features/responses/server/repository.memory";
import { createResponsesService, type ResponsesService } from "@/features/responses/server/responses-service";
import { createFixedWindowLimiter, type RateLimiter } from "@/shared/server/rate-limit";
import type { TokenVerifier } from "@/shared/server/session";

/**
 * Banco de pruebas de la API: servicios reales sobre repositorios en memoria, para sustituir
 * `@/features/container` con `vi.mock` en las pruebas de rutas.
 */
export interface ApiHarness {
  forms: FormsService;
  responses: ResponsesService;
  limiters: { submit: RateLimiter; write: RateLimiter };
}

export const HOST = "localhost:3000";
export const ORIGIN = `http://${HOST}`;
export const VALID_COOKIE_PREFIX = "valida-";

let current: ApiHarness | null = null;
let codeCounter = 0;

/** Crea un banco nuevo (estado vacío) y lo deja como el actual. */
export function resetHarness(): ApiHarness {
  const formsRepo = new MemoryFormsRepository();
  const responsesRepo = new MemoryResponsesRepository((formId) => formsRepo.incrementResponses(formId));
  current = {
    forms: createFormsService({
      repo: formsRepo,
      generateCode: () => {
        codeCounter += 1;
        return `codigo${codeCounter}`;
      },
    }),
    responses: createResponsesService({ forms: formsRepo, responses: responsesRepo }),
    limiters: {
      submit: createFixedWindowLimiter({ limit: 20, windowMs: 60_000 }),
      write: createFixedWindowLimiter({ limit: 60, windowMs: 60_000 }),
    },
  };
  return current;
}

export function currentHarness(): ApiHarness {
  if (current === null) {
    return resetHarness();
  }
  return current;
}

/** Doble del Admin SDK: una cookie `valida-<uid>` es válida para `<uid>`; cualquier otra se rechaza. */
export const fakeVerifier: TokenVerifier = {
  async verifySessionCookie(cookie: string) {
    if (!cookie.startsWith(VALID_COOKIE_PREFIX)) {
      throw new Error("cookie inválida");
    }
    return { uid: cookie.slice(VALID_COOKIE_PREFIX.length) };
  },
  async verifyIdToken() {
    throw new Error("token inválido");
  },
};

type JsonBody = string | number | boolean | null | JsonBody[] | { [key: string]: JsonBody };

interface RequestOptions {
  method?: string;
  uid?: string;
  origin?: string | null;
  body?: JsonBody;
  rawBody?: string;
  contentType?: string;
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers({ host: HOST });
  if (options.uid !== undefined) {
    headers.set("cookie", `sesion=${VALID_COOKIE_PREFIX}${options.uid}`);
  }
  if (options.origin !== null) {
    headers.set("origin", options.origin ?? ORIGIN);
  }
  headers.set("content-type", options.contentType ?? "application/json");
  headers.set("x-forwarded-for", "203.0.113.7");
  return headers;
}

function buildBody(options: RequestOptions): string | undefined {
  if (options.rawBody !== undefined) {
    return options.rawBody;
  }
  if (options.body !== undefined) {
    return JSON.stringify(options.body);
  }
  return undefined;
}

/** Petición a la API con `Host` y `Origin` del mismo sitio por defecto. */
export function apiRequest(path: string, options: RequestOptions = {}): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, {
    method: options.method ?? "GET",
    headers: buildHeaders(options),
    body: buildBody(options),
  });
}

/** Contexto de ruta dinámica (`params` es una promesa en Next 16). */
export function params<T>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}
