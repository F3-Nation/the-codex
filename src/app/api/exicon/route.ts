// src/app/api/exicon/route.ts

import { NextResponse } from "next/server";
import { fetchAllEntries } from "../../../lib/api";
import type { ExiconEntry, AnyEntry } from "../../../lib/types";

/**
 * Handles GET requests to fetch exicon entries from the database.
 * This endpoint leverages the `fetchAllEntries` function from `src/lib/api.ts`
 * and filters the results to only include entries of type 'exicon'.
 */
export async function GET() {
  try {
    const allEntries: AnyEntry[] = await fetchAllEntries("exicon");

    const exiconEntries: ExiconEntry[] = allEntries.filter(
      (entry): entry is ExiconEntry => entry.type === "exicon",
    );

    return NextResponse.json(exiconEntries, { status: 200 });
  } catch (error: any) {
    console.error("❌ API Error: Could not fetch exicon entries:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch exicon entries. Please check server logs for details.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
