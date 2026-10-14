const GITHUB_API = "https://api.github.com";

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function headers(token: string, extra?: Record<string, string>): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "vizonix",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

function encodeRepoPath(filePath: string): string {
  return filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export async function readRepoFile(
  filePath: string,
): Promise<{ text: string; sha: string } | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) return null;

  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${encodeRepoPath(filePath)}?ref=${encodeURIComponent(branch)}`,
    { headers: headers(token), cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status}).`);
  }
  const body = (await response.json()) as { content?: string; sha?: string };
  if (!body.content || !body.sha) return null;
  return {
    text: Buffer.from(body.content, "base64").toString("utf8"),
    sha: body.sha,
  };
}

export async function writeRepoFile(
  filePath: string,
  content: string,
  message: string,
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) {
    throw new Error("GITHUB_TOKEN and GITHUB_REPO are required.");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readRepoFile(filePath);
    const response = await fetch(
      `${GITHUB_API}/repos/${repo}/contents/${encodeRepoPath(filePath)}`,
      {
        method: "PUT",
        headers: headers(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          message,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          sha: current?.sha,
        }),
      },
    );
    if (response.ok) return;
    if (response.status === 409 && attempt === 0) continue;
    const detail = await response.text();
    throw new Error(`GitHub write failed (${response.status}): ${detail.slice(0, 240)}`);
  }
}
