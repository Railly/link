import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    // Handles that were renamed with scripts/rename.mjs keep their old links working.
    return [{ source: "/sofiaferro", destination: "/sofiferro", permanent: true }];
  },
};

export default nextConfig;
