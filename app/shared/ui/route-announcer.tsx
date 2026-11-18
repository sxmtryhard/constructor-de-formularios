"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Lleva el foco al `<h1>` de la página nueva (o a `<main>` si no hay) sin borde de foco extra. */
function focusNewPage(): void {
  const main = document.getElementById("contenido");
  if (main === null) {
    return;
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
    // Dos cuadros: el contenido nuevo y el título ya están en el DOM antes de leerlos.
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        focusNewPage();
        setMessage(`Página: ${document.title}`);
      });
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
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
