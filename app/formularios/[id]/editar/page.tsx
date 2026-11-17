import type { Metadata } from "next";
import { Suspense } from "react";
import { FormBuilder } from "@/features/forms/ui/form-builder";
import { LoadingSkeleton } from "@/shared/ui/status";

export const metadata: Metadata = { title: "Editar formulario" };

async function BuilderWithId({ params }: { params: PageProps<"/formularios/[id]/editar">["params"] }) {
  const { id } = await params;
  return <FormBuilder id={id} />;
}

export default function EditFormPage({ params }: PageProps<"/formularios/[id]/editar">) {
  return (
    <Suspense fallback={<LoadingSkeleton label="Cargando el constructor…" />}>
      <BuilderWithId params={params} />
    </Suspense>
  );
}
