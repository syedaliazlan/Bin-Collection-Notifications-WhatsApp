/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Prevent HTML cache so after deploy users get fresh chunk URLs (avoids 404 ChunkLoadError)
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      { source: '/', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] },
      { source: '/schedule', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] },
      { source: '/tenants', headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }] },
    ];
  },
  // Ensure path aliases work in build
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };
    return config;
  },
}

module.exports = nextConfig
