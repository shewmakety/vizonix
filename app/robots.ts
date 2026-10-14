import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const aiAgents = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  const shared = { allow: "/", disallow: ["/api/"] };
  return {
    rules: [
      { userAgent: "*", ...shared },
      ...aiAgents.map((userAgent) => ({ userAgent, ...shared })),
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
