import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");
    
    if (session?.value === "authenticated") {
      return NextResponse.json({ authenticated: true });
    }
    
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
