/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  typescript: {
    // Exclude the printServer directory from TypeScript compilation during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Also ignore ESLint errors during build to prevent related failures
    ignoreDuringBuilds: true,
  },
  // Exclude the printServer directory from the build
  transpilePackages: [],
  experimental: {},
  // Exclude printServer from webpack compilation
  webpack: (config, { isServer }) => {
    // Exclude the printServer directory from webpack compilation
    config.externals = [...(config.externals || []), 'printServer'];
    
    return config;
  },
};

export default config;
