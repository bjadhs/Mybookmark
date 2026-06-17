import { NextResponse } from "next/server";
import { deleteComment, getCommentById } from "@/lib/db/comments";
import { getCurrentUserInfo } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/** A comment may be deleted by its author or by an admin. */
export async function DELETE(_request: Request, context: RouteContext) {
  const me = await getCurrentUserInfo();
  if (!me.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const comment = await getCommentById(id);

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isAuthor = comment.userId === me.userId;
    if (!isAuthor && me.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
