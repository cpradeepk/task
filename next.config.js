/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 15

  // Vercel deployment optimizations
  output: 'standalone',

  // Image optimization for Vercel
  images: {
    domains: [],
    unoptimized: false,
  },

  // Performance optimizations
  experimental: {
    // Disable CSS optimization for now to avoid critters dependency issue
    // optimizeCss: true,
  },

  // Environment variables validation
  env: {
    GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
  },

  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },

  // Webpack configuration for Google APIs
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
      }
    }

    // Optimize chunk loading
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      },
    }

    return config
  },
}

module.exports = nextConfig
