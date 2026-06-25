import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server (`.next/standalone`) for the Docker
  // runner stage — see Dockerfile.
  output: "standalone",
  images: {
    remotePatterns: [
      // Clerk user avatars used in comment threads.
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
