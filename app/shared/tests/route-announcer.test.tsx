// @vitest-environment jsdom
import "@/tests/helpers/dom";
import { axeViolations, describeViolations } from "@/tests/helpers/axe";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAnnouncer } from "../ui/route-announcer";

/** Ruta actual que devuelve `usePathname`; cada prueba la cambia para simular la navegación. */
const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

const TITLE = "Ingresar · Constructor de formularios";

/** Página como la del layout: `<main id="contenido">` con (o sin) `<h1>`, y el anunciador. */
function Page(props: { withHeading: boolean }) {
  if (!props.withHeading) {
    return (
      <>
        <main id="contenido">
          <p>Contenido sin título</p>
        </main>
        <RouteAnnouncer />
      </>
    );
  }
  return (
    <>
      <main id="contenido">
        <h1>Ingresar</h1>
      </main>
      <RouteAnnouncer />
    </>
  );
}

function navigateTo(pathname: string, rerender: (ui: ReactNode) => void, withHeading: boolean) {
  navigation.pathname = pathname;
  rerender(<Page withHeading={withHeading} />);
}

beforeEach(() => {
  navigation.pathname = "/";
  document.title = TITLE;
});

describe("RouteAnnouncer: carga inicial", () => {
  it("en la carga inicial no mueve el foco y el anunciador está vacío", async () => {
    render(<Page withHeading />);

    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(document.body);
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveAttribute("tabindex");
  });
});

describe("RouteAnnouncer: cambio de ruta del cliente", () => {
  it("al navegar de / a /login el foco va al h1 y se anuncia «Página: <título>»", async () => {
    const { rerender } = render(<Page withHeading />);
    await screen.findByRole("status");

    navigateTo("/login", rerender, true);

    const heading = screen.getByRole("heading", { level: 1, name: "Ingresar" });
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("status")).toHaveTextContent(`Página: ${TITLE}`);
  });

  it("si la página nueva no tiene h1, el foco va a main", async () => {
    const { rerender } = render(<Page withHeading={false} />);
    await screen.findByRole("status");

    navigateTo("/formularios", rerender, false);

    const main = screen.getByRole("main");
    await waitFor(() => {
      expect(document.activeElement).toBe(main);
    });
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("status")).toHaveTextContent(`Página: ${TITLE}`);
  });

  it("cada navegación anuncia el título de la página nueva", async () => {
    const { rerender } = render(<Page withHeading />);
    await screen.findByRole("status");

    navigateTo("/login", rerender, true);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(`Página: ${TITLE}`);
    });

    document.title = "Mis formularios · Constructor de formularios";
    navigateTo("/formularios", rerender, true);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Página: Mis formularios · Constructor de formularios");
    });
  });

  it("volver a renderizar con la misma ruta no mueve el foco ni anuncia", async () => {
    const { rerender } = render(<Page withHeading />);
    await screen.findByRole("status");

    navigateTo("/", rerender, true);
    // Se esperan los mismos dos cuadros que usa el anunciador antes de comprobar que no hizo nada.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    expect(document.activeElement).toBe(document.body);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("RouteAnnouncer: accesibilidad (axe)", () => {
  it("tras un cambio de ruta, la página con el anunciador no tiene violaciones", async () => {
    const { container, rerender } = render(<Page withHeading />);
    await screen.findByRole("status");

    navigateTo("/login", rerender, true);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(`Página: ${TITLE}`);
    });

    const violations = await axeViolations(container);

    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});
