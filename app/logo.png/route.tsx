import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  const font = await readFile(path.join(process.cwd(), "assets/fonts/LibreBaskerville-Regular.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#122033",
          color: "#f3f0e8",
          fontSize: 280,
          fontFamily: "Libre Baskerville",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 512,
            height: 512,
            alignItems: "center",
            justifyContent: "center",
            background: "#122033",
            color: "#f3f0e8",
          }}
        >
          <div style={{ display: "flex", fontSize: 280, fontFamily: "Libre Baskerville" }}>V</div>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
      fonts: [{ name: "Libre Baskerville", data: font, style: "normal" }],
    },
  );
}
