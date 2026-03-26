/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Evita conflito ESM/CJS do postgres.js e drizzle no Webpack
  serverExternalPackages: ['postgres', 'drizzle-orm'],
};

export default nextConfig;
