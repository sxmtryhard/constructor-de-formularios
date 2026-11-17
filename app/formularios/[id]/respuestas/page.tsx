import type { Metadata } from "next";
import { Suspense } from "react";
import { ResponsesView } from "@/features/responses/ui/responses-view";
import { LoadingSkeleton } from "@/shared/ui/status";

export const metadata: Metadata = { title: "Respuestas" };

async function ResponsesWithId({ params }: { params: PageProps<"/formularios/[id]/respuestas">["params"] }) {
  const { id } = await params;
  return <ResponsesView id={id} />;
}

export default function ResponsesPage({ params }: PageProps<"/formularios/[id]/respuestas">) {
  return (
    <Suspense fallback={<LoadingSkeleton label="Cargando respuestas…" />}>
      <ResponsesWithId params={params} />
    </Suspense>
  );
}
