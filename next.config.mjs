/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🧩 Webpack tweaks (cliente)
  webpack(config, { isServer }) {
    // Polyfills desactivados explícitamente en cliente (evita errores "fs/path/os..." en bundle del browser)
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

  /**
   * 🔶 Sobre "allowedDevOrigins":
   * En Next 15.5.3 la clave `allowedDevOrigins` no es reconocida por el validador,
   * por eso el warning de "Unrecognized key". Si QUIERES mantener una lista para
   * tu overlay/entorno, guárdala como valor propio y consúmela desde tu código.
   * No afecta al build.
   */
  // No-op para Next; úsalo desde tu código (por ej. leyendo via import del config con create-env).
  // O cámbialo a un .env para cero warnings.
  __customAllowedDevOrigins: [
    // Regex que cubre subdominios tipo "3000-..." en Workstations
    /^https:\/\/\d{4}-firebase-studio-[\w-]+\.cloudworkstations\.dev$/,
    // Orígenes concretos que ya viste
    "https://3000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev",
    "https://9000-firebase-studio-1757248254463.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev",
  ],
};

export default nextConfig;
