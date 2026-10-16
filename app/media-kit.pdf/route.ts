import { mediaKitPdf } from "@/lib/media-kit";

export const runtime = "nodejs";

export function GET() {
  const pdf = mediaKitPdf();
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"vizonix-media-kit.pdf\"",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
