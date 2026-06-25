import { NextResponse } from "next/server";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/lib/db/projects";
import { guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { projectInputSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = projectInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const project = await updateProject(id, parsed.data);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const deleted = await deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
