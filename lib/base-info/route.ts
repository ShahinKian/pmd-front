import { NextResponse } from "next/server";
import { BaseInfoError, type BaseInfoResponse } from "./types";
import { parsePositiveExternalId } from "./normalize";

export function positiveRouteId(value: string, fieldName: string): number {
  try {
    return parsePositiveExternalId(value, fieldName);
  } catch {
    throw new BaseInfoError("BAD_REQUEST", `${fieldName} must be a positive integer.`, 400);
  }
}

export async function baseInfoRoute<T>(
  operation: () => Promise<BaseInfoResponse<T>>,
): Promise<NextResponse> {
  try {
    const payload = await operation();
    return NextResponse.json(payload, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BaseInfoError) {
      return NextResponse.json(
        { IsSuccess: false, Message: safeMessage(error), Data: null, code: error.code },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { IsSuccess: false, Message: "خطای غیرمنتظره در سرویس اطلاعات پایه رخ داد.", Data: null, code: "UNEXPECTED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function safeMessage(error: BaseInfoError): string {
  switch (error.code) {
    case "BAD_REQUEST": return "پارامتر ارسالی به سرویس اطلاعات پایه معتبر نیست.";
    case "CONFIGURATION": return "تنظیمات سرویس اطلاعات پایه کامل نیست.";
    case "TIMEOUT":
    case "NETWORK": return "ارتباط با سرویس اطلاعات پایه برقرار نشد.";
    default: return "سرویس اطلاعات پایه در حال حاضر پاسخ صحیح نمی‌دهد.";
  }
}
