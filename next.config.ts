import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Workaround for a Next dev overlay bug:
    // "Could not find the module ... segment-explorer-node.js#SegmentViewNode in the React Client Manifest"
    // which can also lead to 404s for /_next/static chunks + extracted CSS in dev.
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
