
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    allowedDevOrigins: [
      /\.cluster-[a-z0-9]+\.cloudworkstations\.dev$/,
      'http://localhost:3000',
      'http://10.88.0.3:3000',
    ],
  },
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/login',
        permanent: true,
      },
    ]
  },
};

module.exports = nextConfig;
