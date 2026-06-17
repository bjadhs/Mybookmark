import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Clerk user avatars used in comment threads.
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
