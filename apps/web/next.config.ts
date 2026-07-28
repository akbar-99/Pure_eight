import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to the monorepo, not the inferred one.
    // A stray package.json/package-lock.json in the home directory made Next infer
    // /Users/<you> as the root, so Turbopack watched the entire home folder and
    // froze the machine on first request. Must stay at the repo root (not apps/web)
    // so hoisted workspace dependencies still resolve.
    root: path.resolve(__dirname, "..", ".."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qdegqmxcvjppjhzyzbpb.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
