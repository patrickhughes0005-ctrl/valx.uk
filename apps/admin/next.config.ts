import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@valx/brand", "@valx/pricing-policy"],
  experimental: {
    typedEnv: true
  }
};

export default nextConfig;

