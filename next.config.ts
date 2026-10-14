import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/checkout": ["./content/**/*"],
    "/api/publish": ["./content/**/*"],
    "/api/stripe/webhook": ["./content/**/*"],
    "/sponsor": ["./content/**/*"],
    "/[segment]": ["./content/**/*"],
    "/[segment]/issues": ["./content/**/*"],
    "/[segment]/issues/[date]": ["./content/**/*"],
    "/[segment]/tools": ["./content/**/*"],
    "/[segment]/tools/[slug]": ["./content/**/*"],
    "/llms.txt": ["./content/**/*"],
    "/llms-full.txt": ["./content/**/*"],
    "/sitemap.xml": ["./content/**/*"],
  },
};

export default nextConfig;
