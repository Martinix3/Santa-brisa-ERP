
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is a new feature in Next.js 15.5+ that helps with security in development.
  // We need to allow the origin from which Firebase Studio serves the preview.
  // You can find this origin in the server logs if it changes.
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      allowedDevOrigins: [
        'https://*.cloudworkstations.dev',
      ],
    },
  }),
};

export default nextConfig;
