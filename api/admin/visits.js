
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL;

function passwordMatches(supplied, expected) {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method not allowed");
  }

  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return res.status(500).send("ADMIN_PASSWORD is not configured.");
  }

  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Basic\s+(.+)$/i);
  let supplied = "";

  if (match) {
    try {
      const decoded = Buffer.from(match[1], "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0) supplied = decoded.slice(separator + 1);
    } catch {
      supplied = "";
    }
  }

  if (!passwordMatches(supplied, expected)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Visitor Logs"');
    return res.status(401).send("Authentication required.");
  }

  if (!connectionString) {
    return res.status(500).send("Database connection is not configured.");
  }

  try {
    const sql = neon(connectionString);

    const visits = await sql`
      SELECT id, ip_address, visited_at, page_path
      FROM visits
      ORDER BY visited_at DESC
      LIMIT 1000
    `;

    const rows = visits.map((visit) => `
      <tr>
        <td>${escapeHtml(visit.id)}</td>
        <td>${escapeHtml(visit.ip_address)}</td>
        <td>${escapeHtml(new Date(visit.visited_at).toISOString())}</td>
        <td>${escapeHtml(visit.page_path)}</td>
      </tr>
    `).join("");

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Visitor Logs</title>
  <style>
    body { font: 16px system-ui, sans-serif; margin: 32px; color: #222; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f3f3f3; }
    td { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <h1>Website Visitor Logs</h1>
  <p>Showing ${visits.length} most recent visits, maximum 1,000.</p>
  <table>
    <thead><tr><th>ID</th><th>IP Address</th><th>Timestamp (UTC)</th><th>Page</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">No visits recorded yet.</td></tr>'}</tbody>
  </table>
</body>
</html>`);
  } catch (error) {
    console.error("Could not retrieve visits:", error);
    return res.status(500).send("Unable to load visitor logs.");
  }
}

