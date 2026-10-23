import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  outputFileTracingIncludes: {
    "/api/vehicles/[id]/sticker": ["./assets/fonts/**"],
    "/api/stickers/batch": ["./assets/fonts/**"],
  },
};

export default nextConfig;
