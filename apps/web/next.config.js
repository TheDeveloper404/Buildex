/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101/api'
    return [
      {
        source: '/api/:path*',
        destination: apiUrl + '/:path*',
      },
    ]
  },
}

module.exports = nextConfig
