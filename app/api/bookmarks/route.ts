import { NextResponse } from "next/server";
import { createBookmark, getBookmarks } from "@/lib/db/bookmarks";
import { getCurrentUserInfo, guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { bookmarkInputSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const { userId } = await getCurrentUserInfo();
    const bookmarks = await getBookmarks(userId);
    return NextResponse.json(bookmarks);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const parsed = bookmarkInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const bookmark = await createBookmark(parsed.data);
    return NextResponse.json(bookmark, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
