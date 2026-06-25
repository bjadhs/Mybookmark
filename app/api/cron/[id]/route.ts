import { NextResponse } from "next/server";
import { deleteCronJob, updateCronJob } from "@/lib/db/cron";
import { guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { cronJobInputSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = cronJobInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const job = await updateCronJob(id, parsed.data);
    if (!job) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const deleted = await deleteCronJob(id);
    if (!deleted) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
