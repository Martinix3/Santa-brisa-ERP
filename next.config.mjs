// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Permite orígenes de desarrollo (Cloud Workstations, localhost, IP local)
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://0.0.0.0:3000',
    'http://10.88.0.3:3000',
    // comodín para tus subdominios de Workstations en dev
    'https://*-firebase-studio-*.cloudworkstations.dev',
  ],

  // ✅ (Opcional) si haces Server Actions desde ese origen en dev
  experimental: {
    serverActions: {
      allowedOrigins: ['https://*-firebase-studio-*.cloudworkstations.dev'],
    },
  },

  // 🧩 Webpack tweaks (cliente)
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    // WASM async si lo necesitas
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

// ⛔️ Quita por completo el campo no soportado para evitar el warning:
// __customAllowedDevOrigins: [ ... ]

export default nextConfig;
