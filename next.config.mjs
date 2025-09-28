// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Es mejor usar una variable de entorno
    allowedDevOrigins: process.env.ALLOWED_DEV_ORIGIN 
      ? [process.env.ALLOWED_DEV_ORIGIN] 
      : undefined,
  },
};

export default nextConfig;
