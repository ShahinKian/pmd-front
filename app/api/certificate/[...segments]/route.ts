import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { getPermitEstimates } from "@/lib/certificate/base-info";
import { baseInfoService } from "@/lib/base-info/service";
import { BaseInfoError } from "@/lib/base-info/types";

type Context = { params: Promise<{ segments: string[] }> };

async function forward(request: NextRequest, context: Context) {
  const { segments } = await context.params;
  if (segments.some((segment) => !/^[a-z0-9-]+$/i.test(segment))) {
    return Response.json({ message: "مسیر مجوز معتبر نیست." }, { status: 400 });
  }

  const path = `/api/certificate/${segments.join("/")}`;
  const isIssue = request.method === "POST" && segments.length === 5 &&
    segments[0] === "networks" && segments[2] === "periods" && segments[4] === "issue";
  const isAddDutyCrew = request.method === "POST" && segments.length === 3 &&
    segments[0] === "networks" && segments[2] === "duty-crew";

  try {
    let body: string | undefined;
    const headers = new Headers();
    if (isIssue || isAddDutyCrew) {
      const { response: preparation } = await authenticatedPmdFetch(request, path, { signal: request.signal });
      if (!preparation.ok) return forwardResponse(preparation);
      const key = process.env.PMD_CERTIFICATE_FRONT_KEY;
      if (!key || key.length < 32) {
        return Response.json({ message: "کلید ارتباط داخلی فرانت و بک‌اند تنظیم نشده است." }, { status: 503 });
      }
      headers.set("X-PMD-Certificate-Key", key);
      if (isIssue) {
        const { alreadyIssued, planIds } = await preparation.json() as { alreadyIssued: boolean; planIds: number[] };
        body = JSON.stringify({ estimates: alreadyIssued ? [] : await getPermitEstimates(planIds) });
      } else {
        await preparation.body?.cancel();
        const input = await request.json().catch(() => null);
        const { jobId, personnelId } = input ?? {};
        if (!Number.isSafeInteger(jobId) || jobId <= 0 || !Number.isSafeInteger(personnelId) || personnelId <= 0) {
          return Response.json({ message: "شغل و عامل برنامه‌ساز را انتخاب کنید." }, { status: 400 });
        }
        const makers = await baseInfoService.getProgramMakers(jobId, Number(segments[1]));
        const maker = makers.Data.find((item) => Number(item.Value) === personnelId && item.Disabled !== true);
        if (!maker) {
          return Response.json({ message: "عامل انتخاب‌شده برای این شبکه و شغل پیدا نشد." }, { status: 400 });
        }
        body = JSON.stringify({ jobId, personnelId, personnelName: maker.Text });
      }
    } else if (["POST", "PUT"].includes(request.method)) {
      body = await request.text();
    }

    const { response } = await authenticatedPmdFetch(request, path, {
      method: request.method,
      headers,
      body,
      signal: request.signal,
    }, isIssue ? 120_000 : undefined);
    return forwardResponse(response);
  } catch (error) {
    if (error instanceof BaseInfoError) {
      return Response.json({ message: "دریافت اطلاعات پایه برای مجوز انجام نشد." }, { status: error.status });
    }
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
