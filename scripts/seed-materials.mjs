// One-time, idempotent import of the bundled static prompt library
// (src/components/promptLibrary.ts) into the material_items table, so the
// admin backend can manage every material shown on the frontend.
//
// Usage: DATABASE_URL=postgres://... node scripts/seed-materials.mjs
//
// Idempotent: each item is keyed by legacy_case_number and skipped if already
// present, so re-running never duplicates. Deploy only applies schema.sql; this
// seed is a deliberate manual step.
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const source = path.join(process.cwd(), "src", "components", "promptLibrary.ts");
const raw = await fs.readFile(source, "utf8");
const start = raw.indexOf("[", raw.indexOf("promptLibraryItems"));
const end = raw.indexOf("] satisfies");
if (start < 0 || end < 0) {
  console.error("Could not locate promptLibraryItems array in", source);
  process.exit(1);
}
const items = JSON.parse(raw.slice(start, end + 1));
console.log(`Parsed ${items.length} bundled materials from ${path.relative(process.cwd(), source)}`);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

let inserted = 0;
let skipped = 0;
try {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    // Higher sort_order shows first (desc primary sort); preserve original order.
    const sortOrder = items.length - index;
    const result = await pool.query(
      `
        insert into material_items (title, category, prompt, image_url, legacy_case_number, sort_order, status, created_by)
        select $1, $2, $3, $4, $5, $6, 'active', 'seed'
        where not exists (select 1 from material_items where legacy_case_number = $5)
      `,
      [item.title, item.category || "", item.prompt || "", item.image, item.caseNumber, sortOrder]
    );
    if (result.rowCount > 0) inserted += 1;
    else skipped += 1;
  }
  console.log(`Seed complete: ${inserted} inserted, ${skipped} already present.`);
} finally {
  await pool.end();
}
