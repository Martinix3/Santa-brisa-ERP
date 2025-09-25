// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Permisivo para desarrollo: no exige lista de dominios de imágenes
  images: {
    unoptimized: true,
  },

  // No rompas el build por ESLint/TS mientras estabilizas
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
