import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/auth";
import { isKnownAction, runAction } from "@/lib/server-bridge";

// Shells `ssh`/`docker` — Node runtime, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, params } = body as {
    action?: unknown;
    params?: unknown;
  };

  if (typeof action !== "string" || !isKnownAction(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const safeParams =
    params && typeof params === "object" ? (params as Record<string, unknown>) : {};

  try {
    const result = await runAction(action, safeParams);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
