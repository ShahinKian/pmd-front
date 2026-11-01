import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { isSameOriginRequest } from "@/lib/auth/security";

export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  if(!isSameOriginRequest(request)) return NextResponse.json({message:"درخواست نامعتبر است."},{status:403});
  const {id}=await params;
  let body:unknown;
  try{body=await request.json();}catch{return NextResponse.json({message:"بدنه درخواست معتبر نیست."},{status:400});}
  const {response}=await authenticatedPmdFetch(request,`/api/keywords/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify(body)});
  return proxyJsonResponse(response);
}
