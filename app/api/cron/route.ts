import { NextResponse } from "next/server";
import { createCronJob, getCronJobs, getEnabledCronJobs } from "@/lib/db/cron";
import { getCurrentUserInfo, guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { cronJobInputSchema } from "@/lib/schemas";

/**
 * Admins get the full job list (to manage on /cron); any other signed-in user
 * gets only the enabled jobs, which their browser needs to evaluate triggers.
 * Guests get nothing — cron delivery requires an identity + email.
 */
export async function GET() {
  const me = await getCurrentUserInfo();
  if (!me.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs =
      me.role === "admin"
        ? await getCronJobs()
        : await getEnabledCronJobs(true);
    return NextResponse.json(jobs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const parsed = cronJobInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const job = await createCronJob(parsed.data);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
