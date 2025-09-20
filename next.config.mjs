/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // optimizePackageImports está obsoleto en Next.js 14+ y se puede eliminar.
    // Lo mantenemos comentado por si se usa una versión anterior, pero es mejor quitarlo.
    // optimizePackageImports: ['lucide-react'],
  },
  eslint: {
    // Advertencia: Esto deshabilita ESLint durante la compilación.
    // Se recomienda ejecutar ESLint como parte del proceso de CI/CD.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Advertencia: Esto deshabilita la comprobación de tipos durante la compilación.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
