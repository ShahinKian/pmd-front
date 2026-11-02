import { NextRequest, NextResponse } from "next/server";
import { draftUser, DraftAuthError } from "@/lib/program-profiles/draft-auth";
import { readDraft, writeDraft, DraftConflict } from "@/lib/program-profiles/draft-store";
import { isProfileDraft } from "@/lib/program-profiles/draft";
import { isSameOriginRequest } from "@/lib/auth/security";
import { authenticatedPmdFetch } from "@/lib/auth/request";
export const runtime="nodejs";
type Context={params:Promise<{forecastId:string}>};
async function access(request:NextRequest, context:Context) {
  const {forecastId}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(forecastId)) return {error:NextResponse.json({message:"شناسه نامعتبر است."},{status:400})};
  const user=await draftUser(request);
  if(!user) return {error:NextResponse.json({message:"ورود به سیستم الزامی است."},{status:401})};
  const {response}=await authenticatedPmdFetch(request,`/api/forecasts/${forecastId}`);
  if(!response.ok) return {error:NextResponse.json({message:"دسترسی به پیش‌بینی امکان‌پذیر نیست."},{status:response.status})};
  return {user,forecastId};
}
export async function GET(request:NextRequest, context:Context) {
  try {
    const auth=await access(request,context); if(auth.error) return auth.error;
    return NextResponse.json(await readDraft(auth.user!,auth.forecastId!),{headers:{"Cache-Control":"no-store"}});
  } catch(error) { if(error instanceof DraftAuthError)return NextResponse.json({message:error.message},{status:error.status}); return NextResponse.json({message:"خواندن پیش‌نویس انجام نشد؛ دوباره تلاش کنید."},{status:503}); }
}
export async function PUT(request:NextRequest, context:Context) {
  if(!isSameOriginRequest(request)) return NextResponse.json({message:"درخواست نامعتبر است."},{status:403});
  try {
    const auth=await access(request,context); if(auth.error) return auth.error;
    const raw=await request.text();
    if(Buffer.byteLength(raw)>1024*1024) return NextResponse.json({message:"حجم پیش‌نویس بیش از حد مجاز است."},{status:413});
    let body; try { body=JSON.parse(raw); } catch(error) { if(error instanceof DraftAuthError)return NextResponse.json({message:error.message},{status:error.status}); return NextResponse.json({message:"داده نامعتبر است."},{status:400}); }
    if(!isProfileDraft(body?.data) || body.data.forecastId!==auth.forecastId || !Number.isInteger(body.revision) || body.revision<0)
      return NextResponse.json({message:"اطلاعات پیش‌نویس معتبر نیست."},{status:400});
    return NextResponse.json(await writeDraft(auth.user!,body.data,body.revision));
  } catch(error) {
    if(error instanceof DraftAuthError)return NextResponse.json({message:error.message},{status:error.status});
    if(error instanceof DraftConflict) return NextResponse.json({message:"پیش‌نویس در صفحه دیگری تغییر کرده یا در حال ذخیره است؛ ابتدا صفحه را بازخوانی کنید."},{status:409});
    return NextResponse.json({message:"ذخیره پیش‌نویس انجام نشد؛ صفحه را نبندید و دوباره تلاش کنید."},{status:503});
  }
}
