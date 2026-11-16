import { NextResponse, type NextRequest } from "next/server";
import { authenticatedPmdFetch } from "@/lib/auth/request";
import { proxyJsonResponse } from "@/lib/auth/route";
import { proxyRoleMutation } from "../mutation";

type RoleRoute = { params: Promise<{ roleId: string }> };

async function rolePath(route: RoleRoute) {
  const { roleId } = await route.params;
  return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(roleId) ? `/api/auth/roles/${roleId}` : null;
}

function invalidRoleId() {
  return NextResponse.json({ message: "شناسه نقش معتبر نیست." }, { status: 400 });
}

export async function GET(request: NextRequest, route: RoleRoute) {
  const path = await rolePath(route);
  if (!path) return invalidRoleId();
  const { response } = await authenticatedPmdFetch(request, path);
  return proxyJsonResponse(response);
}

export async function PUT(request: NextRequest, route: RoleRoute) {
  const path = await rolePath(route);
  return path ? proxyRoleMutation(request, path, "PUT") : invalidRoleId();
}

export async function DELETE(request: NextRequest, route: RoleRoute) {
  const path = await rolePath(route);
  return path ? proxyRoleMutation(request, path, "DELETE") : invalidRoleId();
}
