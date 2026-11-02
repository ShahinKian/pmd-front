import { NextRequest, NextResponse } from "next/server";
import { draftUser, DraftAuthError } from "@/lib/program-profiles/draft-auth";
import { listDrafts } from "@/lib/program-profiles/draft-store";
export const runtime="nodejs";
export async function GET(request:NextRequest) {
  try {
    const user=await draftUser(request);
    if(!user) return NextResponse.json({message:"ورود به سیستم الزامی است."},{status:401});
    return NextResponse.json(await listDrafts(user),{headers:{"Cache-Control":"no-store"}});
  } catch(error) { if(error instanceof DraftAuthError)return NextResponse.json({message:error.message},{status:error.status}); return NextResponse.json({message:"دریافت پیش‌نویس‌ها انجام نشد."},{status:503}); }
}
