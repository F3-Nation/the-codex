import { getEntryByIdFromDatabase } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  try {
    const { entryId } = await params;

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 },
      );
    }

    const entry = await getEntryByIdFromDatabase(entryId);

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Return only the data needed for meta tags
    const responseData = {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      type: entry.type,
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=300, s-maxage=600", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Error fetching entry for API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
