// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ TOP-LEVEL (no dentro de experimental)
  allowedDevOrigins: [
    'localhost:3000',
    '0.0.0.0:3000',
    '10.88.0.3:3000',
    '*-firebase-studio-*.cloudworkstations.dev', // comodín Workstations
  ],

  experimental: {
    serverActions: {
      // ✅ aquí sí: orígenes extra permitidos para Server Actions
      allowedOrigins: ['*-firebase-studio-*.cloudworkstations.dev'],
    },
  },

  // 🧩 Webpack tweaks (cliente)
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, os: false, crypto: false,
        stream: false, http: false, https: false, zlib: false,
        net: false, tls: false, child_process: false,
      };
    }
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;

