/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    styledComponents: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: {
    allowedDevOrigins: [
      "https://9000-firebase-studio-1757248254463.cluster-fbfjltn365c6wqxlhoehbz44sk.cloudworkstations.dev",
    ],
  },
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });
    config.resolve.fallback = { fs: false };
    return config;
  },
  async redirects() {
    return [
      // Consolidación Ventas - Redirect legacy routes to new /ventas/clientes
      {
        source: "/ventas/cuentas-comerciales",
        destination: "/ventas/clientes",
        permanent: true,
      },
      {
        source: "/accounts",
        destination: "/ventas/clientes",
        permanent: true,
      },
      {
        source: "/contacts",
        destination: "/ventas/clientes",
        permanent: true,
      },
      {
        source: "/contacts/:id",
        destination: "/ventas/clientes/:id",
        permanent: true,
      },
      {
        source: "/ventas/crm",
        destination: "/ventas/clientes",
        permanent: true,
      },
      {
        source: "/ventas/sell-in",
        destination: "/ventas/pedidos",
        permanent: true,
      },
      {
        source: "/ventas/sell-out",
        destination: "/ventas/analytics?tab=sellout",
        permanent: true,
      },
      {
        source: "/ventas/shopify",
        destination: "/ventas/analytics?tab=shopify",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
