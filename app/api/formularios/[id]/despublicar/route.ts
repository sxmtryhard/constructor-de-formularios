import type { NextRequest } from "next/server";
import { getFormsService, getRateLimiters } from "@/features/container";
import { exigirOrigen, json, manejar } from "@/shared/server/http";
import { requerirUsuario } from "@/shared/server/session";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: Context) {
  return manejar(async () => {
    exigirOrigen(request);
    const user = await requerirUsuario(request);
    const now = new Date();
    getRateLimiters().write.consume(user.uid, now);
    const { id } = await context.params;
    return json(await getFormsService().unpublish(user.uid, id, now));
  });
}
