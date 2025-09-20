// next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tu configuración de Next.js existente va aquí
  // Por ahora está vacía, pero si añades cosas, van dentro de este objeto.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withBundleAnalyzer(nextConfig);