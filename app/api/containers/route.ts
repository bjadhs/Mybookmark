import { NextResponse } from "next/server";
import { createContainer, getContainers } from "@/lib/db/containers";
import { guardAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const containers = await getContainers();
    return NextResponse.json(containers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name } = body as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Container name is required" },
        { status: 400 }
      );
    }
    const container = await createContainer(body as { name: string });
    return NextResponse.json(container, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
