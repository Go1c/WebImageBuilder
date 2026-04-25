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

const schemaPath = path.join(process.cwd(), "src", "server", "db", "schema.sql");
const sql = await fs.readFile(schemaPath, "utf8");

try {
  await pool.query(sql);
  console.log("Database schema applied");
} finally {
  await pool.end();
}
