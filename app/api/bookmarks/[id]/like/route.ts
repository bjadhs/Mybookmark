import { NextResponse } from "next/server";
import { toggleLike } from "@/lib/db/likes";
import { guardUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Toggle the signed-in user's like on a bookmark. Any authenticated user may
 * like (admins included); guests get a 401. Returns the new like state.
 */
export async function POST(_request: Request, context: RouteContext) {
  const guard = await guardUser();
  if (guard.response) return guard.response;

  try {
    const { id } = await context.params;
    const state = await toggleLike(id, guard.user.userId!);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Bookmark not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
