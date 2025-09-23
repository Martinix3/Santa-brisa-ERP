// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Permite el overlay en los subdominios efímeros del Workstations
    // (puedes ampliar con otros hosts internos si usas puertos distintos)
    // @ts-ignore - la opción está marcada experimental
    allowedDevOrigins: [
      /.*-firebase-studio-.*\.cloudworkstations\.dev$/,
      /localhost:\d+$/,
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'clipboard-write=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
