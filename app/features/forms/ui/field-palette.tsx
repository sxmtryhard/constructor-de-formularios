"use client";

import { type FieldType, MAX_FIELDS } from "../schema";
import { FIELD_TYPE_LABEL } from "./builder-reducer";

const TYPES: FieldType[] = ["texto", "parrafo", "numero", "seleccion", "casillas", "fecha"];

interface FieldPaletteProps {
  total: number;
  dragSupported: boolean;
  onAdd: (tipo: FieldType) => void;
  onDragStart: (tipo: FieldType) => void;
  onDragEnd: () => void;
}

/** Paleta de tipos: un clic (o Enter) agrega al final; si el navegador lo permite, también se arrastra. */
export function FieldPalette({ total, dragSupported, onAdd, onDragStart, onDragEnd }: FieldPaletteProps) {
  const full = total >= MAX_FIELDS;
  return (
    <section aria-labelledby="titulo-paleta" className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <h2 id="titulo-paleta" className="text-xl font-bold text-primary-strong">
        Agregar campo
      </h2>
      <p className="text-sm text-ink-muted">
        {total} de {MAX_FIELDS} campos.
        {dragSupported && " Pulsa un tipo para agregarlo al final o arrástralo a la posición que quieras."}
      </p>
      {full && (
        <p role="status" className="font-semibold text-warning">
          Llegaste al máximo de {MAX_FIELDS} campos.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-1">
        {TYPES.map((tipo) => (
          <li key={tipo}>
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={full}
              draggable={dragSupported && !full}
              onClick={() => onAdd(tipo)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("text/plain", tipo);
                onDragStart(tipo);
              }}
              onDragEnd={onDragEnd}
            >
              Agregar {FIELD_TYPE_LABEL[tipo]}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
