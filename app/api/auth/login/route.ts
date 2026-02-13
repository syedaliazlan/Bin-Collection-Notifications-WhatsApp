import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set("admin_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  return NextResponse.json({ success: true });
}
