import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyWithPagination } from "@/lib/http/pagination";

export async function GET(request:NextRequest){
  const query=request.nextUrl.searchParams.toString();
  const {response}=await authenticatedPmdFetch(request,`/api/experts${query?`?${query}`:""}`);
  return proxyWithPagination(response);
}
