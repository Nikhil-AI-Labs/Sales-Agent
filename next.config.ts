import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fix: suppress workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  // Fix: add headers so ngrok browser interstitial is bypassed
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "ngrok-skip-browser-warning", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
