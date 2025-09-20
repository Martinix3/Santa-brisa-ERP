
// next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // La opción `allowedDevOrigins` se elimina ya que causaba advertencias.
  // La opción `devIndicators.appIsrStatus` se elimina porque está obsoleta.
};

export default withBundleAnalyzer(nextConfig);
