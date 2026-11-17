import { TooManyRequestsError } from "./errors";

/** Límite de frecuencia: lanza `TooManyRequestsError` si la clave supera el máximo en la ventana. */
export interface RateLimiter {
  consume(key: string, now: Date): void;
}

interface CounterWindow {
  start: number;
  count: number;
}

const MAX_KEYS = 10_000;

/** Ventana fija en memoria (por instancia del servidor; el tiempo se inyecta). */
export function createFixedWindowLimiter(options: { limit: number; windowMs: number }): RateLimiter {
  const windows = new Map<string, CounterWindow>();

  function purge(nowMs: number): void {
    for (const [key, counter] of windows) {
      if (nowMs - counter.start >= options.windowMs) {
        windows.delete(key);
      }
    }
  }

  return {
    consume(key: string, now: Date): void {
      const nowMs = now.getTime();
      if (windows.size > MAX_KEYS) {
        purge(nowMs);
      }
      const current = windows.get(key);
      if (current === undefined || nowMs - current.start >= options.windowMs) {
        windows.set(key, { start: nowMs, count: 1 });
        return;
      }
      if (current.count >= options.limit) {
        const retryAfter = Math.max(1, Math.ceil((current.start + options.windowMs - nowMs) / 1000));
        throw new TooManyRequestsError(retryAfter);
      }
      current.count += 1;
    },
  };
}
