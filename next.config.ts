import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plain HTML, CSS and JS in out/, served as static assets by a Cloudflare Worker (wrangler.jsonc).
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
