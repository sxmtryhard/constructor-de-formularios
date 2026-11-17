import type { NextRequest } from "next/server";
import { getRateLimiters, getResponsesService } from "@/features/container";
import { SubmitInput } from "@/features/responses/schema";
import { exigirOrigen, ipDe, json, leerJson, manejar } from "@/shared/server/http";

interface Context {
  params: Promise<{ codigo: string }>;
}

/** Envío público de una respuesta (sin sesión): Origin, 20/min por IP, cuerpo ≤ 64 KB. */
export async function POST(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const now = new Date();
    getRateLimiters().submit.consume(ipDe(request), now);
    const input = await leerJson(request, SubmitInput);
    const { codigo } = await context.params;
    return json(await getResponsesService().submit(codigo, input, now), 201);
  });
}
