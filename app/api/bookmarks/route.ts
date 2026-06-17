import { NextResponse } from "next/server";
import { createBookmark, getBookmarks } from "@/lib/db/bookmarks";
import { getCurrentUserInfo, guardAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const { userId } = await getCurrentUserInfo();
    const bookmarks = await getBookmarks(userId);
    return NextResponse.json(bookmarks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
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

    const bookmark = await createBookmark({
      title: typeof title === "string" ? title : "",
      url: typeof url === "string" ? url : "",
      desc: typeof desc === "string" ? desc : "",
      categoryId: typeof categoryId === "string" ? categoryId : "",
      previewImage: typeof previewImage === "string" ? previewImage : null,
    });

    return NextResponse.json(bookmark, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
