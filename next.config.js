/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  allowedDevOrigins: [
    'https://3000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev',
    'https://9000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev',
    'http://localhost:3000',
    'http://10.88.0.3:3000',
  ],
  async redirects() {
    return [{ source: '/signup', destination: '/login', permanent: true }];
  },
};

module.exports = nextConfig;
