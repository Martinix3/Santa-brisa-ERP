
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Silencia el warning de cross-origin en entornos de desarrollo en la nube.
    allowedDevOrigins: [
      "*.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev",
    ],
    // Optimiza las importaciones de paquetes para un build más rápido.
    optimizePackageImports: [
      "lucide-react",
      "@fullcalendar/core",
      "@fullcalendar/daygrid",
      "@fullcalendar/interaction",
      "@fullcalendar/list",
      "@fullcalendar/react",
      "@fullcalendar/timegrid",
      "firebase",
      "firebase-admin",
      "react-dom",
      "react",
      "recharts",
    ],
  },
};

// Envuelve la configuración con el analizador de bundles si ANALYZE=true
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
