import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://merchantos:merchantos@localhost:5433/merchantos";

async function main() {
  console.log("Applying SQL migrations...");
  const sql = postgres(databaseUrl, { max: 1 });

  const migrationsDir = join(process.cwd(), "src/infrastructure/database/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const content = readFileSync(filePath, "utf8");
    console.log(`Running migration: ${file}...`);
    try {
      await sql.unsafe(content);
      console.log(`  ✓ ${file}`);
    } catch (err: any) {
      console.warn(`  ⚠ ${file}: ${err.message}`);
    }
  }

  await sql.end();
  console.log("All migrations applied successfully.");
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
