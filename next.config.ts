import type { NextConfig } from "next";

// Detecta se está fazendo build para APK (export estático)
const isCapacitorBuild = process.env.BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Export estático apenas para build do APK
  ...(isCapacitorBuild && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  // Headers de segurança e PWA (apenas no modo web)
  ...(!isCapacitorBuild && {
    async headers() {
      return [
        {
          source: "/sw.js",
          headers: [
            { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
            { key: "Service-Worker-Allowed", value: "/" },
          ],
        },
        {
          source: "/manifest.json",
          headers: [
            { key: "Cache-Control", value: "public, max-age=86400" },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
