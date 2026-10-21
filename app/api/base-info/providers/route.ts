import type { NextRequest } from "next/server";
import { authenticatedBaseInfoRoute } from "@/lib/base-info/auth-route";
import { loadAllProviders } from "@/lib/base-info/provider";

export async function GET(request: NextRequest) {
  return authenticatedBaseInfoRoute(request, () => loadAllProviders());
}
