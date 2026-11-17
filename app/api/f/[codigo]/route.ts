import type { NextRequest } from "next/server";
import { getFormsService } from "@/features/container";
import { json, manejar } from "@/shared/server/http";

interface Context {
  params: Promise<{ codigo: string }>;
}

/** Definición pública del formulario; caché compartida de 30 s (cerrar o despublicar tarda hasta 30 s en verse). */
export async function GET(_request: NextRequest, context: Context) {
  return manejar(async () => {
    const { codigo } = await context.params;
    const form = await getFormsService().getPublic(codigo, new Date());
    return json(form, 200, { "Cache-Control": "public, s-maxage=30" });
  });
}
