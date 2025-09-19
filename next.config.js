// next.config.js
/** @type {import('next').NextConfig} */
const isExtensionBuild = process.env.BUILD_TARGET === 'extension';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuração específica para extensão
  ...(isExtensionBuild && {
    output: 'export',
    trailingSlash: true,
    distDir: 'out',
  }),
  
  images: {
    unoptimized: true,
  },
  
  experimental: {
    esmExternals: false,
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },
};

// Adicionar proxy apenas em desenvolvimento (não para extensão)
if (!isExtensionBuild) {
  nextConfig.async = {
    rewrites: async () => [
      {
        source: '/api/finesse/:path*',
        destination: 'https://sncfinesse1.totvs.com.br:8445/finesse/api/:path*',
      },
      {
        source: '/api/finesse2/:path*',
        destination: 'https://sncfinesse2.totvs.com.br:8445/finesse/api/:path*',
      }
    ],
    
    headers: async () => [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ],
  };
}

module.exports = nextConfig;