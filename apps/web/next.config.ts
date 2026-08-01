import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@consultorio/ui', '@consultorio/contracts'],
  typedRoutes: true,
};

export default nextConfig;
