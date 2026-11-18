// @vitest-environment jsdom
import "@/tests/helpers/dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorPanel, LoadingSkeleton } from "../ui/status";

describe("ErrorPanel: el usuario ve qué falló y puede reintentar", () => {
  it("anuncia el error como alerta con su mensaje", () => {
    render(<ErrorPanel error={{ error: "No se pudo cargar la lista" }} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la lista");
  });

  it("muestra cada detalle del error con su campo y mensaje", () => {
    render(
      <ErrorPanel
        error={{
          error: "Datos inválidos",
          detalles: [
            { campo: "titulo", mensaje: "El título es obligatorio" },
            { campo: "campos", mensaje: "Máximo 30 campos" },
          ],
        }}
      />,
    );

    const alert = screen.getByRole("alert");
    const items = within(alert).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("titulo: El título es obligatorio");
    expect(items[1]).toHaveTextContent("campos: Máximo 30 campos");
  });

  it("sin detalles no muestra una lista vacía", () => {
    render(<ErrorPanel error={{ error: "Fallo", detalles: [] }} />);

    expect(within(screen.getByRole("alert")).queryByRole("list")).not.toBeInTheDocument();
  });

  it("el botón «Reintentar» llama a onRetry una vez por clic", async () => {
    const onRetry = vi.fn<() => void>();
    const user = userEvent.setup();
    render(<ErrorPanel error={{ error: "Sin conexión" }} onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("sin onRetry no ofrece el botón «Reintentar»", () => {
    render(<ErrorPanel error={{ error: "Sin conexión" }} />);

    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("si la sesión falló, ofrece un enlace para ingresar", () => {
    render(<ErrorPanel error={{ error: "Sesión requerida" }} loginHref="/ingresar" />);

    expect(screen.getByRole("link", { name: "Ingresar" })).toHaveAttribute("href", "/ingresar");
  });
});

describe("LoadingSkeleton: la carga se anuncia a lectores de pantalla", () => {
  it("expone role status con el texto de carga", () => {
    render(<LoadingSkeleton label="Cargando formularios…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando formularios…");
  });
});
