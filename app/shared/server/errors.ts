import type { ErrorDetail } from "../schema";

/** Error de dominio: lo lanzan los servicios y `http.ts` lo traduce a su código HTTP. */
export class DomainError extends Error {
  readonly status: number;
  readonly detalles: ErrorDetail[] | undefined;

  constructor(message: string, status: number, detalles?: ErrorDetail[]) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.detalles = detalles;
  }
}

/** 400: datos inválidos, con detalles por campo. */
export class ValidationError extends DomainError {
  constructor(message = "Datos no válidos", detalles?: ErrorDetail[]) {
    super(message, 400, detalles);
  }
}

/** 401: sin sesión o sesión inválida. */
export class UnauthorizedError extends DomainError {
  constructor(message = "No autenticado") {
    super(message, 401);
  }
}

/** 403: origen no permitido o acción prohibida. */
export class ForbiddenError extends DomainError {
  constructor(message = "Prohibido") {
    super(message, 403);
  }
}

/** 404: no existe o no es del usuario. */
export class NotFoundError extends DomainError {
  constructor(message = "No encontrado") {
    super(message, 404);
  }
}

/** 409: conflicto de estado. */
export class ConflictError extends DomainError {
  constructor(message = "Conflicto") {
    super(message, 409);
  }
}

/** 410: el recurso existió pero ya no está disponible (formulario cerrado). */
export class GoneError extends DomainError {
  constructor(message = "Ya no está disponible") {
    super(message, 410);
  }
}

/** 413: cuerpo demasiado grande. */
export class PayloadTooLargeError extends DomainError {
  constructor(message = "El cuerpo de la petición es demasiado grande") {
    super(message, 413);
  }
}

/** 415: tipo de contenido no admitido. */
export class UnsupportedMediaTypeError extends DomainError {
  constructor(message = "Se esperaba application/json") {
    super(message, 415);
  }
}

/**
 * Dato guardado que no cumple su esquema (documento corrupto en la base). No es un error de dominio:
 * `manejar` lo responde como 500 genérico, sin detalles, en vez de como 400 del cliente.
 */
export class CorruptDataError extends Error {
  constructor(message = "Dato guardado no válido") {
    super(message);
    this.name = "CorruptDataError";
  }
}

/** 429: demasiadas peticiones; `retryAfter` en segundos. */
export class TooManyRequestsError extends DomainError {
  readonly retryAfter: number;

  constructor(retryAfter: number, message = "Demasiadas peticiones, intenta más tarde") {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}
