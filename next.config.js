/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ['http://*.cloudworkstations.dev','https://*.cloudworkstations.dev'],
  },
};
module.exports = nextConfig;
