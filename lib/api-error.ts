import { NextResponse } from "next/server";
import { z } from "zod";
import { isDbConnectionError } from "@/lib/db";
import { InvalidInputError } from "@/lib/schemas";

/**
 * Turn a `ZodError` from a failed `safeParse` into a 400 response. `error` is a
 * concise first message (handy for the existing client `errorMessage` helper);
 * `fieldErrors` carries the full per-field map so forms can show inline errors.
 */
export function validationError(error: z.ZodError): NextResponse {
  const flat = z.flattenError(error);
  const first =
    flat.formErrors[0] ??
    Object.values(flat.fieldErrors).flat()[0] ??
    "Validation failed";
  return NextResponse.json(
    { error: first, fieldErrors: flat.fieldErrors },
    { status: 400 }
  );
}

/**
 * Shared catch-block handler for read routes. When the failure is the Postgres
 * server being unreachable, return a 503 tagged `db_unavailable` so the client
 * can render the friendly "database isn't running" screen. Everything else
 * stays a 500 with the original message (existing behavior).
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof InvalidInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isDbConnectionError(error)) {
    return NextResponse.json(
      { error: "Database is not running", code: "db_unavailable" },
      { status: 503 }
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ error: message }, { status: 500 });
}
