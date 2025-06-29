const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // FORCE DIFFERENT BUILD HASH TO BYPASS CACHE
  generateBuildId: async () => {
    return 'gorchain-fix-' + Date.now()
  },
  webpack: (config, { isServer }) => {
    // Handle Node.js polyfills for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: 'process/browser',
        buffer: 'buffer',
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        util: 'util',
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
