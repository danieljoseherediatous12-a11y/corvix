import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async redirects() {
    return [
      { source: "/arqueo", destination: "/cash-count", permanent: true },
      { source: "/busqueda", destination: "/search", permanent: true },
      { source: "/cierre", destination: "/closing", permanent: true },
      { source: "/configuracion", destination: "/settings", permanent: true },
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/historial", destination: "/history", permanent: true },
      { source: "/operacion", destination: "/operations", permanent: true },
      { source: "/operacion/nueva", destination: "/operations/new", permanent: true },
      { source: "/reportes", destination: "/reports", permanent: true },
    ];
  },
};

export default nextConfig;
