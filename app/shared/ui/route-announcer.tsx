"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Cada cuánto se mira `document.title` y cuánto se espera como máximo a que Next lo ponga (llega con el streaming). */
const TITLE_POLL_MS = 50;
const TITLE_TIMEOUT_MS = 1500;

/** Lleva el foco al `<h1>` de la página nueva (o a `<main>` si no hay) sin borde de foco extra. Devuelve el texto del `<h1>`. */
function focusNewPage(): string {
  const main = document.getElementById("contenido");
  if (main === null) {
    return "";
  }
  const heading = main.querySelector("h1");
  let target: HTMLElement = main;
  if (heading !== null) {
    target = heading;
  }
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.setAttribute("data-route-focus", "");
  target.focus({ preventScroll: false });
  if (heading === null) {
    return "";
  }
  return (heading.textContent ?? "").trim();
}

/**
 * Llama a `onTitle` en cuanto `document.title` no esté vacío; si pasa el tope, usa `fallback` (el texto del `<h1>`).
 * Devuelve la función que cancela la espera.
 */
function waitForTitle(fallback: string, onTitle: (title: string) => void): () => void {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    const title = document.title.trim();
    if (title !== "") {
      onTitle(title);
      return;
    }
    if (Date.now() - startedAt >= TITLE_TIMEOUT_MS) {
      onTitle(fallback);
      return;
    }
    timer = setTimeout(check, TITLE_POLL_MS);
  };
  check();
  return () => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  };
}

/**
 * F17 · Reto 2: en cada cambio de ruta del cliente (no en la carga inicial) mueve el foco al `<h1>`
 * y anuncia «Página: <título>» en una región `aria-live="polite"` visualmente oculta. Sin animación.
 */
function PathAnnouncer() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (previousPath.current === null) {
      previousPath.current = pathname;
      return;
    }
    if (previousPath.current === pathname) {
      return;
    }
    previousPath.current = pathname;
    let innerFrame = 0;
    let cancelTitleWait: (() => void) | undefined;
    // Dos cuadros: el contenido nuevo ya está en el DOM antes de enfocar; el título se espera aparte.
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        const headingText = focusNewPage();
        cancelTitleWait = waitForTitle(headingText, (title) => {
          setMessage(`Página: ${title}`);
        });
      });
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
      if (cancelTitleWait !== undefined) {
        cancelTitleWait();
      }
    };
  }, [pathname]);

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}

/** `usePathname()` lee la URL de la petición: con Cache Components va dentro de `<Suspense>`. */
export function RouteAnnouncer() {
  return (
    <Suspense fallback={null}>
      <PathAnnouncer />
    </Suspense>
  );
}
