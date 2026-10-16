function ascii(text: string): string {
  return text.replace(/[^\t\n\r\x20-\x7e]/g, "");
}

function pdfString(text: string): string {
  const safe = ascii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  return `(${safe})`;
}

function wrapLine(text: string, width: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** One-column text PDF. Enough for the media kit download, with no extra dependency. */
export function textPdf(paragraphs: string[]): Uint8Array {
  const lines = paragraphs.flatMap((paragraph) => wrapLine(paragraph, 90));
  const pageSize = 46;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }
  if (pages.length === 0) pages.push([""]);

  const fontId = 3;
  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  let nextId = 4;
  for (let index = 0; index < pages.length; index += 1) {
    pageIds.push(nextId);
    nextId += 1;
    contentIds.push(nextId);
    nextId += 1;
  }

  const obj = (id: number, body: string) => `${id} 0 obj\n${body}\nendobj\n`;
  objects.push(obj(1, "<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(
    obj(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`),
  );
  objects.push(obj(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));

  pages.forEach((pageLines, index) => {
    const commands = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"];
    for (const line of pageLines) {
      commands.push(`${pdfString(line)} Tj`, "T*");
    }
    commands.push("ET");
    const stream = commands.join("\n");
    objects.push(
      obj(
        pageIds[index],
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
      ),
    );
    objects.push(obj(contentIds[index], `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`));
  });

  const header = "%PDF-1.4\n";
  let offset = Buffer.byteLength(header);
  const offsets = [0];
  const chunks = [header];
  for (const object of objects) {
    offsets.push(offset);
    chunks.push(object);
    offset += Buffer.byteLength(object);
  }
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  chunks.push(xref);
  return new Uint8Array(Buffer.from(chunks.join(""), "latin1"));
}
