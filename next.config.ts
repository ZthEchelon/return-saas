import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure Tailwind resolves correctly in webpack builds.
  webpack: config => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      tailwindcss: path.join(__dirname, "node_modules/tailwindcss"),
    };
    return config;
  },
};

export default nextConfig;
