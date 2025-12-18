/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Generate unique build IDs to prevent chunk caching issues
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Disable powered by header
  poweredByHeader: false,
}

module.exports = nextConfig
