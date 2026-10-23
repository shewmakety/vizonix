import type { NextConfig } from "next";

// Report-only for now. Watch the browser console / reports, then switch the header name to
// Content-Security-Policy. Inline scripts and styles are needed by Next.js without nonces.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
    "/[segment]/latest": ["./content/**/*"],
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
