import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["undici"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "*.ggpht.com",
      },
    ],
  },
};

export default nextConfig;
