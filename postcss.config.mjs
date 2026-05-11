/**
 * PostCSS configuration for TailwindCSS v4 + Next.js
 * Ensures Tailwind and Autoprefixer run during the build pipeline.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
