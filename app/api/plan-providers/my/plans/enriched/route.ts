import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { baseInfoService } from "@/lib/base-info/service";
import type { PlanProviderLink } from "@/lib/plan-providers/types";

function pickText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = ["title", "Title", "name", "Name", "planTitle", "PlanTitle", "planName", "PlanName", "Text", "text"];
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractTitle(data: unknown, planId: number): string {
  if (Array.isArray(data)) {
    for (const item of data) {
      const text = pickText(item);
      if (text) return text;
    }
  } else {
    const text = pickText(data);
    if (text) return text;
  }
  return `طرح شماره ${planId}`;
}

export async function GET(request: NextRequest) {
  const { response } = await authenticatedPmdFetch(
    request,
    "/api/plan-providers/my/plans",
  );

  if (!response.ok) {
    const body = await readUpstreamBody(response);
    return NextResponse.json(body, { status: response.status });
  }

  const body = await readUpstreamBody(response);
  const links = Array.isArray(body) ? body as PlanProviderLink[] : [];

  const plans = await Promise.all(
    links.map(async (link) => {
      try {
        const detail = await baseInfoService.getPlanDetail(link.planId);
        return { ...link, title: extractTitle(detail.Data, link.planId) };
      } catch {
        return { ...link, title: `طرح شماره ${link.planId}` };
      }
    }),
  );

  return NextResponse.json(plans);
}
