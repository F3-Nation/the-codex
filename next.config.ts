import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow clipboard access when embedded in iframes (e.g., on f3nation.com)
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "clipboard-write=(self \"https://f3nation.com\" \"https://www.f3nation.com\")",
          },
        ],
      },
      {
        source: "/callback/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://auth.f3nation.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/callback/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://auth.f3nation.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
