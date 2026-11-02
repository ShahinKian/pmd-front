import type { NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";

export class DraftAuthError extends Error { constructor(public status:number){super("احراز هویت یا دسترسی به سرویس امکان‌پذیر نیست.");} }

export async function draftUser(request:NextRequest):Promise<string|null> {
  const {response}=await authenticatedPmdFetch(request,"/api/auth/profile");
  if(response.status===401) return null;
  if(!response.ok) throw new DraftAuthError(response.status);
  const profile=await response.json();
  return typeof profile.id==="string" && profile.id ? profile.id : null;
}
