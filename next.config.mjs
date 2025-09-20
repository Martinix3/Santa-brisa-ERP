/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Opcional: esconder indicador ISR en app router
  devIndicators: { appIsrStatus: false },

  experimental: {
    // Mejora bundling de libs comunes
    optimizePackageImports: ['lucide-react', 'recharts'],

    // Evita los avisos de cross-origin en Workstations/Studio
    allowedDevOrigins: [
      "https://6000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev",
      "https://9000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev"
    ]
  },

};

export default nextConfig;
