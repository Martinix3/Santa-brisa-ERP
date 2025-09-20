/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,          // <= boolean, no string
  // Si quieres exponer Next en Cloud Workstations:
  devIndicators: { appIsrStatus: false }, // opcional
  // Otras opciones que puedes usar
  experimental: {
    // opcional: mejora bundling de libs
    optimizePackageImports: ['lucide-react', 'recharts']
  }
};

module.exports = nextConfig;
