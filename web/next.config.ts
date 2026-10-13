import type { NextConfig } from "next";

const ENGINE_URL = (process.env.ENGINE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${ENGINE_URL}/api/:path*` },
      { source: "/outputs/:path*", destination: `${ENGINE_URL}/outputs/:path*` },
      { source: "/backgrounds/:path*", destination: `${ENGINE_URL}/backgrounds/:path*` },
      { source: "/reference_repo/:path*", destination: `${ENGINE_URL}/reference_repo/:path*` },
      { source: "/stock_videos/:path*", destination: `${ENGINE_URL}/stock_videos/:path*` },
    ];
  },
};

export default nextConfig;
