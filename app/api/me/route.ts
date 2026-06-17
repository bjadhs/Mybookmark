import { NextResponse } from "next/server";
import { getCurrentUserInfo } from "@/lib/auth";

/**
 * Lightweight identity endpoint for the client. Exposes only what the UI needs
 * to decide which controls to render — the server still enforces every action.
 */
export async function GET() {
  const me = await getCurrentUserInfo();
  return NextResponse.json({
    role: me.role,
    isSignedIn: me.userId !== null,
    isAdmin: me.role === "admin",
    name: me.name,
    imageUrl: me.imageUrl,
  });
}
