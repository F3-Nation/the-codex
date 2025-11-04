// src/app/api/lexicon/route.ts

import { NextResponse } from "next/server";
import { fetchAllEntries } from "../../../lib/api";
import type { LexiconEntry, AnyEntry } from "../../../lib/types";

/**
 * Handles GET requests to fetch lexicon entries from the database.
 */
export async function GET() {
  try {
    const allEntries: AnyEntry[] = await fetchAllEntries("lexicon");
    const lexiconEntries: LexiconEntry[] = allEntries.filter(
      (entry): entry is LexiconEntry => entry.type === "lexicon",
    );

    return NextResponse.json(lexiconEntries, { status: 200 });
  } catch (error: any) {
    console.error("❌ API Error: Could not fetch lexicon entries:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch lexicon entries. Please check server logs for details.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
