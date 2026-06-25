import { NextResponse } from "next/server";
import { createCategory, getCategories } from "@/lib/db/categories";
import { guardAdmin } from "@/lib/auth";
import { handleApiError, validationError } from "@/lib/api-error";
import { categoryInputSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const category = await createCategory(parsed.data.name);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
