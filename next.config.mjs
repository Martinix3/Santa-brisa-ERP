/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Recommended for framer-motion etc.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  compiler: {
    // For styled-components
    // styledComponents: true,
  },
  devIndicators: {
    allowedDevOrigins: [
      '6000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev'
    ]
  },
  webpack(config) {
    config.externals.push({
      'node-gyp': 'commonjs node-gyp',
    });
    return config;
  },
};

export default nextConfig;
