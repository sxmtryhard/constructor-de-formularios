import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicFormView } from "@/features/forms/ui/public-form-view";
import { LoadingSkeleton } from "@/shared/ui/status";

export const metadata: Metadata = { title: "Responder formulario" };

async function PublicFormWithCode({ params }: { params: PageProps<"/f/[codigo]">["params"] }) {
  const { codigo } = await params;
  return <PublicFormView codigo={codigo} />;
}

export default function PublicFormPage({ params }: PageProps<"/f/[codigo]">) {
  return (
    <Suspense fallback={<LoadingSkeleton label="Cargando el formulario…" />}>
      <PublicFormWithCode params={params} />
    </Suspense>
  );
}
