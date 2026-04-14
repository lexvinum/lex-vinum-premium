import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const rawUrl = req.query.url;

  if (!rawUrl || Array.isArray(rawUrl)) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "Invalid url parameter" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs are allowed" });
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 LexVinumImageProxy/1.0",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return res.status(502).json({
        error: `Upstream responded with ${upstream.status}`,
        url: parsedUrl.toString(),
      });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("pages/api/image error:", error);
    return res.status(500).json({ error: "Internal image proxy error" });
  }
}