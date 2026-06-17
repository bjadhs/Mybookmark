import { NextResponse } from "next/server";
import {
  deleteContainer,
  getContainerById,
  updateContainer,
} from "@/lib/db/containers";
import { guardAdmin } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const container = await getContainerById(id);
    if (!container) {
      return NextResponse.json({ error: "Container not found" }, { status: 404 });
    }
    return NextResponse.json(container);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
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
    const container = await updateContainer(id, body as { name: string });
    if (!container) {
      return NextResponse.json({ error: "Container not found" }, { status: 404 });
    }
    return NextResponse.json(container);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const deleted = await deleteContainer(id);
    if (!deleted) {
      return NextResponse.json({ error: "Container not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
