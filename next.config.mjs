// next.config.mjs
import createNextBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Ojo: false para evitar doble render en dev con mocks
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@fullcalendar/react',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/list',
    ],
    allowedDevOrigins: ["https://*.cloudworkstations.dev"],
  },
  images: {
    remotePatterns: [
        { protocol: 'https', hostname: '**.pinimg.com' },
        { protocol: 'https', hostname: 'picsum.photos' },
    ]
  }
};

const withBundleAnalyzer = createNextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
