import { NextResponse } from "next/server";
import { getEntryByIdFromDatabase } from "@/lib/api";

// Define the handler for GET requests
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const entryId = id;

    const entry = await getEntryByIdFromDatabase(entryId);

    if (!entry) {
      return NextResponse.json(
        { message: "Entry not found." },
        { status: 404 },
      );
    }

    if (entry.type !== "exicon") {
      return NextResponse.json(
        { message: "Entry found, but it is not an exicon type." },
        { status: 400 },
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("API error fetching exicon entry:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 },
    );
  }
}
