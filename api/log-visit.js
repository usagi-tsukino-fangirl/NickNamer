
import { neon } from "@neondatabase/serverless";

const sql = neon(
  process.env.DATABASE_URL || process.env.POSTGRES_URL
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.headers["x-real-ip"] || "unknown";

    const page = typeof req.body?.page_path === "string"
      ? req.body.page_path.slice(0, 500)
      : "/";

    await sql`
      INSERT INTO visits (ip_address, page_path)
      VALUES (${ip}, ${page})
    `;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Visit logging failed:", error);
    return res.status(500).json({ error: "Logging failed" });
  }
}

