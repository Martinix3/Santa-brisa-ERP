/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@genkit-ai/googleai'],
  webpack: (config, { isServer, webpack }) => {
    config.externals.push({
      '@google-cloud/functions-framework': 'commonjs @google-cloud/functions-framework',
    });
    // Ver https://webpack.js.org/configuration/resolve/#resolvefallback
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'utf-8-validate': false,
      'bufferutil': false,
    }
    return config
  },
};
export default nextConfig;
