import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export async function GET() {
  const result = await testConnection();

  if (!result.ok) {
    return NextResponse.json(
      { status: "error", error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" });
}
