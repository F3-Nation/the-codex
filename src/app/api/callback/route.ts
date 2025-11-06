import { NextRequest, NextResponse } from "next/server";

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://auth.f3nation.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Handle GET requests (redirect from OAuth provider)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Add CORS headers to the response
  const headers = {
    "Access-Control-Allow-Origin": "https://auth.f3nation.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // If there's an error parameter, redirect to page with error
  if (error) {
    const url = new URL("/callback", request.url);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url, { headers });
  }

  // If code and state are present, redirect to page route for processing
  if (code && state) {
    const url = new URL("/callback", request.url);
    url.searchParams.set("code", code);
    url.searchParams.set("state", state);
    return NextResponse.redirect(url, { headers });
  }

  // If parameters are missing, redirect to page with error
  const url = new URL("/callback", request.url);
  url.searchParams.set("error", "missing_parameters");
  return NextResponse.redirect(url, { headers });
}
