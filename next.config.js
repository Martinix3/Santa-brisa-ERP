
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is required to allow the Next.js dev server to accept requests from
  // the Cloud Workstations and Code Server origins.
  allowedDevOrigins: [
      "*.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev",
      "*.cloudworkstations.dev",
  ]
};

module.exports = nextConfig;
