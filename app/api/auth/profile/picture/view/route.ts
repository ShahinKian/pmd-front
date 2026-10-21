import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { readUpstreamBody } from "@/lib/auth/upstream";
import { getPmdApiBaseUrl } from "@/lib/pmd-api/config";
import type { UserProfileResponse } from "@/lib/auth/types";

export async function GET(request: NextRequest) {
  const { response: profileResponse } = await authenticatedPmdFetch(
    request,
    "/api/auth/profile",
  );

  if (!profileResponse.ok) {
    return new NextResponse(null, { status: profileResponse.status });
  }

  const body = (await readUpstreamBody(profileResponse)) as UserProfileResponse;
  const picture = body.profilePictureUrl?.trim();

  if (!picture || !picture.startsWith("/uploads/profile-pictures/")) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(`${getPmdApiBaseUrl()}${picture}`, {
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const bytes = await upstream.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=60",
    },
  });
}
