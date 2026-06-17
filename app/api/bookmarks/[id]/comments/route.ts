import { NextResponse } from "next/server";
import { createComment, getComments } from "@/lib/db/comments";
import { guardUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/** Comments are public to read — anyone viewing a bookmark sees them. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const comments = await getComments(id);
    return NextResponse.json(comments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Posting requires any signed-in user; guests get a 401. */
export async function POST(request: Request, context: RouteContext) {
  const guard = await guardUser();
  if (guard.response) return guard.response;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { body: text } = body as Record<string, unknown>;

    const comment = await createComment({
      bookmarkId: id,
      userId: guard.user.userId!,
      authorName: guard.user.name,
      authorImage: guard.user.imageUrl || null,
      body: typeof text === "string" ? text : "",
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Bookmark not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
