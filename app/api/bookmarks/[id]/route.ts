import { NextResponse } from "next/server";
import {
  deleteBookmark,
  getBookmarkById,
  updateBookmark,
} from "@/lib/db/bookmarks";
import { getCurrentUserInfo, guardAdmin } from "@/lib/auth";

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
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { title, url, desc, categoryId, previewImage } = body as Record<
      string,
      unknown
    >;

    const bookmark = await updateBookmark(id, {
      title: typeof title === "string" ? title : "",
      url: typeof url === "string" ? url : "",
      desc: typeof desc === "string" ? desc : "",
      categoryId: typeof categoryId === "string" ? categoryId : "",
      previewImage: typeof previewImage === "string" ? previewImage : null,
    });

    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json(bookmark);
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
    const deleted = await deleteBookmark(id);

    if (!deleted) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
