import { ImageResponse } from "next/og";
import { featuredSegment } from "@/lib/segments";

export const alt = "Vizonix";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const featured = featuredSegment();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#122033",
          color: "#f3f0e8",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Vizonix
        </div>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15, maxWidth: 920 }}>
          AI tools that make a specific business more profitable.
        </div>
        <div style={{ display: "flex", fontSize: 28 }}>{featured.name} is the launch section. The briefing is free.</div>
      </div>
    ),
    { ...size },
  );
}
