import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (
    config: Configuration,
    { isServer }
  ): Configuration => {
    if (!isServer) {
      config.resolve = {
        ...(config.resolve || {}),
        fallback: {
          ...(config.resolve?.fallback || {}),
          dns: false,
          fs: false,
          net: false,
          tls: false,
          'pg-native': false,
        },
      };
    }
    return config;
  },

  async headers() {
    // Static CORS headers for callback endpoints.
    // Dynamic handling also exists in middleware.ts for preflight and origin negotiation.
    const allowOrigin =
      process.env.CLIENT_ORIGIN ||
      (process.env.NODE_ENV === 'development' ? 'https://localhost:3001' : 'https://auth.f3nation.com');
    return [
      {
        source: '/callback/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/api/callback/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;