import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

async function applyFile(filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  await pool.query(sql);
  console.log(`applied ${path.basename(filePath)}`);
}

try {
  await applyFile(path.join(process.cwd(), "src", "server", "db", "schema.sql"));

  const v2Path = path.join(process.cwd(), "src", "server", "db", "migrations", "v2.sql");
  try {
    await fs.access(v2Path);
    await applyFile(v2Path);
  } catch {
    // Optional additive migrations are skipped when the file is absent.
  }

  console.log("Database schema applied");
} finally {
  await pool.end();
}
