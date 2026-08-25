import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
