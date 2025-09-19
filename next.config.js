// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuração para build de extensão
  output: process.env.BUILD_TARGET === 'extension' ? 'export' : undefined,
  trailingSlash: process.env.BUILD_TARGET === 'extension',
  assetPrefix: process.env.BUILD_TARGET === 'extension' ? './' : undefined,
  
  images: {
    unoptimized: true,
  },
  
  // Configuração para extensões Chrome
  experimental: {
    esmExternals: false,
  },
  
  // Variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_ENCRYPTION_KEY: process.env.NEXT_PUBLIC_ENCRYPTION_KEY,
    NEXT_PUBLIC_FINESSE_URL_PRIMARY: process.env.NEXT_PUBLIC_FINESSE_URL_PRIMARY,
    NEXT_PUBLIC_FINESSE_URL_FALLBACK: process.env.NEXT_PUBLIC_FINESSE_URL_FALLBACK,
    NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS,
    NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS: process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS,
    NEXT_PUBLIC_LOCKOUT_DURATION: process.env.NEXT_PUBLIC_LOCKOUT_DURATION,
    NEXT_PUBLIC_SESSION_TIMEOUT: process.env.NEXT_PUBLIC_SESSION_TIMEOUT,
    NEXT_PUBLIC_MIN_TIMER_MINUTES: process.env.NEXT_PUBLIC_MIN_TIMER_MINUTES,
    NEXT_PUBLIC_MAX_TIMER_MINUTES: process.env.NEXT_PUBLIC_MAX_TIMER_MINUTES,
    NEXT_PUBLIC_DEFAULT_STANDARD_TIMER: process.env.NEXT_PUBLIC_DEFAULT_STANDARD_TIMER,
    NEXT_PUBLIC_DEFAULT_PAUSE_TIMER: process.env.NEXT_PUBLIC_DEFAULT_PAUSE_TIMER,
    NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAIN: process.env.NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAIN,
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Configurações específicas para extensão
    if (process.env.BUILD_TARGET === 'extension') {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
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
      };
    }

    return config;
  },

  // Headers de segurança
  async headers() {
    return [
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
    ];
  },
};

module.exports = nextConfig;