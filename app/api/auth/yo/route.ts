import type { NextRequest } from "next/server";
import type { MeResponse } from "@/shared/schema";
import { json, manejar } from "@/shared/server/http";
import { requerirUsuario } from "@/shared/server/session";

export async function GET(request: NextRequest) {
  return manejar(async () => {
    const body: MeResponse = { usuario: await requerirUsuario(request) };
    return json(body);
  });
}
