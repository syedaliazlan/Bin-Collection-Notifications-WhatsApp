import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // Change this in production!

export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  
  if (session?.value === "authenticated") {
    return true;
  }
  
  // Check for password in request
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const password = authHeader.substring(7);
    return password === ADMIN_PASSWORD;
  }
  
  return false;
}

export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const isAuthenticated = await verifyAdmin(request);
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  
  return null;
}

export function setAdminSession() {
  // This will be called from API routes
  // Session is set via Set-Cookie header in response
}
