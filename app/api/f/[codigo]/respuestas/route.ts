import type { NextRequest } from "next/server";
import { getRateLimiters, getResponsesService } from "@/features/container";
import { SubmitInput } from "@/features/responses/schema";
import { PublicCodeParam } from "@/features/forms/schema";
import { exigirOrigen, ipDe, json, leerJson, manejar } from "@/shared/server/http";
import { paramValido } from "@/shared/server/validation";

const NOT_FOUND = "Formulario no encontrado";

interface Context {
  params: Promise<{ codigo: string }>;
}

/** Envío público de una respuesta (sin sesión): Origin, 20/min por IP, cuerpo ≤ 64 KB. */
export async function POST(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const now = new Date();
    getRateLimiters().submit.consume(ipDe(request), now);
    const codigo = paramValido((await context.params).codigo, PublicCodeParam, NOT_FOUND);
    const input = await leerJson(request, SubmitInput);
    return json(await getResponsesService().submit(codigo, input, now), 201);
  });
}
