import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/aviation/tools",
        destination: "/aviation/toolbox",
        permanent: true,
      },
    ];
  },
  htmlLimitedBots: /.*/,
  outputFileTracingIncludes: {
    "/api/checkout": ["./content/**/*"],
    "/api/publish": ["./content/**/*"],
    "/api/linkedin-post": ["./content/**/*"],
    "/api/stripe/webhook": ["./content/**/*"],
    "/sponsor": ["./content/**/*"],
    "/media-kit": ["./content/**/*"],
    "/media-kit.pdf": ["./content/**/*"],
    "/[segment]": ["./content/**/*"],
    "/[segment]/issues": ["./content/**/*"],
    "/[segment]/issues/[date]": ["./content/**/*"],
    "/[segment]/tools": ["./content/**/*"],
    "/[segment]/toolbox": ["./content/**/*"],
    "/[segment]/tools/[slug]": ["./content/**/*"],
    "/[segment]/tools/topic/[topic]": ["./content/**/*"],
    "/llms.txt": ["./content/**/*"],
    "/llms-full.txt": ["./content/**/*"],
    "/sitemap.xml": ["./content/**/*"],
    "/[segment]/feed.xml": ["./content/**/*"],
    "/opengraph-image": ["./assets/fonts/**/*"],
    "/logo.png": ["./assets/fonts/**/*"],
    "/[segment]/opengraph-image": ["./assets/fonts/**/*"],
    "/[segment]/issues/[date]/opengraph-image": ["./assets/fonts/**/*"],
    "/[segment]/tools/opengraph-image": ["./assets/fonts/**/*"],
    "/[segment]/tools/[slug]/opengraph-image": ["./assets/fonts/**/*"],
    "/[segment]/tools/topic/[topic]/opengraph-image": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
