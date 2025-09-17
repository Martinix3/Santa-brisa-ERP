/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, os: false, crypto: false,
        stream: false, http: false, https: false, zlib: false,
        net: false, tls: false, child_process: false,
      };
    }
    return config;
  },
  experimental: {
    // 'allowedDevOrigins' has been moved to the top level in newer Next.js versions
  },
  // Add 'allowedDevOrigins' at the top level
  allowedDevOrigins: [
    'https://3000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev',
    'https://9000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev'
  ],
};
module.exports = nextConfig;
