import { NextResponse } from "next/server";
import {
  deleteBookmark,
  getBookmarkById,
  updateBookmark,
} from "@/lib/db/bookmarks";
import { getCurrentUserInfo, guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { bookmarkInputSchema } from "@/lib/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { userId } = await getCurrentUserInfo();
    const bookmark = await getBookmarkById(id, userId);

    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json(bookmark);
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
    const parsed = bookmarkInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const bookmark = await updateBookmark(id, parsed.data);

    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json(bookmark);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const deleted = await deleteBookmark(id);

    if (!deleted) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
