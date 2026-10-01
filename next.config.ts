import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nobody may frame linkmi pages (clickjacking on the editor, fake overlays on profiles).
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    // Handles that were renamed with scripts/rename.mjs keep their old links working.
    return [{ source: "/sofiaferro", destination: "/sofiferro", permanent: true }];
  },
};

export default nextConfig;
