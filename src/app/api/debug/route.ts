// app/api/debug/route.ts (if using App Router)
export async function GET() {
  return Response.json({
    hasDatabase: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    phase: process.env.NEXT_PHASE,
    // Don't expose the actual URL for security
    dbUrlLength: process.env.DATABASE_URL?.length || 0,
  });
}
