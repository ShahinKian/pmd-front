import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";

type Context = { params: Promise<{ segments: string[] }> };

async function forward(request: NextRequest, context: Context) {
  const { segments } = await context.params;
  if (segments.some((segment) => !/^[a-z0-9-]+$/i.test(segment))) {
    return Response.json({ message: "مسیر مجوز معتبر نیست." }, { status: 400 });
  }

  const path = `/api/certificate/${segments.join("/")}`;
  const isIssue = request.method === "POST" && segments.length === 5 &&
    segments[0] === "networks" && segments[2] === "periods" && segments[4] === "issue";
  try {
    const body = !isIssue && ["POST", "PUT"].includes(request.method) ? await request.text() : undefined;

    const { response } = await authenticatedPmdFetch(request, path, {
      method: request.method,
      body,
      signal: request.signal,
    }, isIssue ? 120_000 : undefined);
    return forwardResponse(response);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json({ message: "زمان پاسخ به پایان رسید. وضعیت دوره را دوباره بررسی کنید." }, { status: 504 });
    }
    return Response.json({ message: "ارتباط با سرویس مجوز برقرار نشد." }, { status: 502 });
  }
}

function forwardResponse(response: Response) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = response.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  return new Response(response.body, { status: response.status, headers });
}

export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
