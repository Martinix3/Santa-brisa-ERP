
/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'standalone', // descomenta para Docker
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true, // TMP
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.pinimg.com',
                port: '',
                pathname: '/originals/**',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            }
        ],
    },
};

export default nextConfig;
