import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { sanitizeSettingsPatch } from "@/lib/settings";
import { guardAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const patch = sanitizeSettingsPatch(body);
    const settings = await updateSettings(patch);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
