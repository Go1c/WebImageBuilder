// Migrate the static prompt library (src/components/promptLibrary.ts) into the
// material_items table so it can be managed from the admin backend.
// Idempotent: skips items whose legacy_case_number already exists.
//
// Usage: DATABASE_URL=... node scripts/import-materials.mjs
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sourcePath = path.join(process.cwd(), "src", "components", "promptLibrary.ts");
const source = await fs.readFile(sourcePath, "utf8");

// Extract the array literal between the first "[" after the export and its
// closing "]" (right before "satisfies"). The items use JSON-quoted keys.
const startMarker = source.indexOf("promptLibraryItems");
const arrayStart = source.indexOf("[", startMarker);
const arrayEnd = source.lastIndexOf("]");
if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) {
  console.error("Could not locate promptLibraryItems array");
  process.exit(1);
}

const arrayLiteral = source.slice(arrayStart, arrayEnd + 1);
let items;
try {
  items = JSON.parse(arrayLiteral);
} catch (error) {
  console.error("Failed to parse promptLibraryItems as JSON:", error.message);
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

let inserted = 0;
let skipped = 0;

try {
  for (const item of items) {
    const caseNumber = Number(item.caseNumber) || null;
    const result = await pool.query(
      `
        insert into material_items (title, category, prompt, image_url, legacy_case_number, sort_order, status, created_by)
        select $1, $2, $3, $4, $5, $6, 'active', 'migration'
        where $5 is null or not exists (
          select 1 from material_items where legacy_case_number = $5
        )
      `,
      [
        item.title || "未命名素材",
        item.category || "",
        item.prompt || "",
        item.image || "",
        caseNumber,
        caseNumber || 0
      ]
    );
    if (result.rowCount > 0) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }
  console.log(`Materials import complete: ${inserted} inserted, ${skipped} skipped (already present).`);
} finally {
  await pool.end();
}
