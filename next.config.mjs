// next.config.mjs — limpio y único
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'santabrisa.es' }
    ]
  },

  experimental: {
    // Permitir previews desde Firebase Studio (puerto variable)
    allowedDevOrigins: [
      'http://localhost:3000',
      /^https:\/\/\d+-firebase-studio-.*\.cloudworkstations\.dev$/
    ]
  }
};

export default nextConfig;
