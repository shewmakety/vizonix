import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

function fit(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

export async function renderOgCard(input: { kicker?: string; title: string; footer: string }) {
  const font = await readFile(path.join(process.cwd(), "assets/fonts/LibreBaskerville-Regular.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#122033",
          color: "#f3f0e8",
        }}
      >
        <div style={{ display: "flex", height: 14, width: "100%", background: "#c4a46a" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "64px 72px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "Libre Baskerville",
            }}
          >
            {input.kicker ?? "Vizonix"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 58,
              lineHeight: 1.15,
              fontFamily: "Libre Baskerville",
              maxWidth: 1000,
            }}
          >
            {fit(input.title, 140)}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontFamily: "Libre Baskerville" }}>{fit(input.footer, 120)}</div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [{ name: "Libre Baskerville", data: font, style: "normal" }],
    },
  );
}
