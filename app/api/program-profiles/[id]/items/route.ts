import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

function isGuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}

export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!isSameOriginRequest(request)) return NextResponse.json({message:"درخواست نامعتبر است."},{status:403});
  const {id}=await params;
  if(!isGuid(id)) return NextResponse.json({message:"شناسه شناسنامه معتبر نیست."},{status:400});
  const body=await request.text();
  const {response}=await authenticatedPmdFetch(request,`/api/program-profiles/${id}/items`,{method:"PUT",body});
  return proxyJsonResponse(response);
}
