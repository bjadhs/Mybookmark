import { NextResponse } from "next/server";
import { createProject, getProjects } from "@/lib/db/projects";
import { guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { projectInputSchema } from "@/lib/schemas";

// The project tracker is admin-only, so even reads are gated.
export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const projects = await getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const parsed = projectInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const project = await createProject(parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
