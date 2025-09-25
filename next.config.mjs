/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Esta opción se deja vacía si no hay otras configuraciones experimentales.
  },
  // allowedDevOrigins va en el nivel superior, no dentro de 'experimental'.
  allowedDevOrigins: [
    "https://*.cloudworkstations.dev",
    "https://*.firebase.studio",
  ],
};

export default nextConfig;
