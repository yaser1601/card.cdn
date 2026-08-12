export default async function handler(req, res) {
  const path = req.query?.path;

  if (!path || Array.isArray(path)) {
    return res.status(400).send("Missing asset path");
  }

  // Prevent path traversal and malformed paths.
  const cleanPath = String(path)
    .replace(/^\/+/, "")
    .replace(/\.\.(\/|\\)/g, "");

  if (!/^(images|voice)\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]+$/.test(cleanPath)) {
    return res.status(400).send("Invalid asset path");
  }

  const base =
    "https://kvkodidoedcdwtuahgkf.supabase.co/storage/v1/object/public/game-assets/";

  const target = base + cleanPath;

  try {
    const response = await fetch(target);

    if (!response.ok) {
      return res.status(response.status).send("Asset not found");
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    const contentLength = response.headers.get("content-length");

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    const arrayBuffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Supabase asset proxy error:", error);
    return res.status(502).send("Failed to fetch asset");
  }
}
