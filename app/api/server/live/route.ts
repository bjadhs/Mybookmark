import { NextResponse } from "next/server";
import { getLiveServerSnapshot } from "@/lib/server-live";

// SSHes out to the host and shells `docker` — must run in the Node runtime and
// never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    const snapshot = await getLiveServerSnapshot(force);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach the server";
    // 502: the app is fine, the upstream SSH/docker call isn't. The client
    // treats this as "live unavailable" and falls back to saved containers.
    return NextResponse.json(
      { error: message, code: "live_unavailable" },
      { status: 502 }
    );
  }
}
