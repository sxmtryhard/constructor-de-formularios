import "server-only";
import { adminAuth, adminDb } from "@/shared/server/firebase-admin";
import { createFixedWindowLimiter, type RateLimiter } from "@/shared/server/rate-limit";
import { createSessionService, type SessionService } from "./auth/server/session-service";
import { createFormsService, type FormsService } from "./forms/server/forms-service";
import type { FormsRepository } from "./forms/server/repository";
import { FirestoreFormsRepository } from "./forms/server/repository.firestore";
import { CascadingMemoryFormsRepository, MemoryFormsRepository } from "./forms/server/repository.memory";
import type { ResponsesRepository } from "./responses/server/repository";
import { FirestoreResponsesRepository } from "./responses/server/repository.firestore";
import { MemoryResponsesRepository } from "./responses/server/repository.memory";
import { createResponsesService, type ResponsesService } from "./responses/server/responses-service";

/**
 * Raíz de composición: el único lugar que conecta features, repositorios y clientes de Firebase.
 * `DATA_BACKEND=memory` usa repositorios en memoria (pruebas y demo sin Firestore; la sesión sigue usando Firebase Auth).
 */
interface Repositories {
  forms: FormsRepository;
  responses: ResponsesRepository;
}

export interface RateLimiters {
  /** 20 envíos por minuto por IP en `POST /api/f/:codigo/respuestas`. */
  submit: RateLimiter;
  /** 60 escrituras por minuto por usuario en rutas privadas. */
  write: RateLimiter;
}

let repositories: Repositories | null = null;
let formsService: FormsService | null = null;
let responsesService: ResponsesService | null = null;
let sessionService: SessionService | null = null;
let rateLimiters: RateLimiters | null = null;

function buildRepositories(): Repositories {
  if (process.env.DATA_BACKEND === "memory") {
    // Las dos se referencian entre sí solo dentro de callbacks, que corren después de construirlas.
    const forms: MemoryFormsRepository = new CascadingMemoryFormsRepository(
      (formId: string): Promise<void> => responses.removeByForm(formId),
    );
    const responses: MemoryResponsesRepository = new MemoryResponsesRepository(
      (formId: string): Promise<void> => forms.incrementResponses(formId),
    );
    return { forms, responses };
  }
  const db = adminDb();
  return { forms: new FirestoreFormsRepository(db), responses: new FirestoreResponsesRepository(db) };
}

function getRepositories(): Repositories {
  if (repositories === null) {
    repositories = buildRepositories();
  }
  return repositories;
}

export function getFormsService(): FormsService {
  if (formsService === null) {
    formsService = createFormsService({ repo: getRepositories().forms });
  }
  return formsService;
}

export function getResponsesService(): ResponsesService {
  if (responsesService === null) {
    const repos = getRepositories();
    // El repositorio de formularios cumple por estructura el puerto `FormReader` de responses.
    responsesService = createResponsesService({ forms: repos.forms, responses: repos.responses });
  }
  return responsesService;
}

export function getSessionService(): SessionService {
  if (sessionService === null) {
    sessionService = createSessionService({ auth: adminAuth() });
  }
  return sessionService;
}

export function getRateLimiters(): RateLimiters {
  if (rateLimiters === null) {
    rateLimiters = {
      submit: createFixedWindowLimiter({ limit: 20, windowMs: 60_000 }),
      write: createFixedWindowLimiter({ limit: 60, windowMs: 60_000 }),
    };
  }
  return rateLimiters;
}
