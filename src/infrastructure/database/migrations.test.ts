/**
 * ADR-092 — OLTP baseline migrations + identity tables + schema-drift gate.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import * as schema from "./schema/index.js";

const root = process.cwd();
const migrationsDir = join(
  root,
  "src/infrastructure/database/migrations",
);

describe("ADR-092 Drizzle Kit OLTP migrations", () => {
  it("exports identity tables alongside domain schema modules", () => {
    expect(schema.authUsers).toBeDefined();
    expect(schema.merchantOtpChallenges).toBeDefined();
    expect(schema.customerIdentities).toBeDefined();
    expect(schema.customerOtpChallenges).toBeDefined();
    expect(schema.merchants).toBeDefined();
    expect(schema.products).toBeDefined();
    expect(schema.sales).toBeDefined();
    expect(schema.storeMemberships).toBeDefined();
  });

  it("commits a drizzle-kit baseline SQL migration (not hand-authored)", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    expect(files.length).toBeGreaterThanOrEqual(1);
    const baseline = files.sort()[0]!;
    expect(baseline).toMatch(/^0000_/);
    const sql = readFileSync(join(migrationsDir, baseline), "utf8");
    expect(sql).toContain('CREATE TABLE "merchants"');
    expect(sql).toContain('CREATE TABLE "auth_users"');
    expect(sql).toContain('CREATE TABLE "customer_identities"');
    expect(sql).toContain('CREATE TABLE "merchant_otp_challenges"');
    expect(sql).toContain('CREATE TABLE "customer_otp_challenges"');
    expect(sql).toContain('CREATE TABLE "products"');
    expect(sql).toContain('CREATE TABLE "sales"');
    expect(sql).toContain("trade_name");
    expect(sql).toMatch(/phone_national/);
    expect(sql.toLowerCase()).not.toMatch(/collate\s+"?sql_ascii/);
    expect(existsSync(join(migrationsDir, "meta", "_journal.json"))).toBe(
      true,
    );
  });

  it("indexes POS barcode, phone lookup, and sale history paths", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    const sql = files
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .join("\n");
    expect(sql).toContain("products_merchant_id_barcode_uq");
    expect(sql).toContain("store_memberships_store_id_phone_national_active_uq");
    expect(sql).toContain("auth_users_phone_national_uq");
    expect(sql).toContain("sales_store_id_completed_at_idx");
  });

  it("wires db:check schema-drift script and CI gate", () => {
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["db:check"]).toMatch(/drizzle-kit check|check-schema-drift/);
    const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toMatch(/db:check|schema.?drift/i);
    expect(
      existsSync(join(root, "scripts/check-schema-drift.mjs")) ||
        Boolean(pkg.scripts?.["db:check"]?.includes("drizzle-kit check")),
    ).toBe(true);
  });

  it("documents expand/contract and Persian-safe apply path in migrations README", () => {
    const readme = readFileSync(join(migrationsDir, "README.md"), "utf8");
    expect(readme).toMatch(/expand\s*\/\s*contract/i);
    expect(readme).toMatch(/UTF-8|Persian/i);
    expect(readme).toMatch(/db:migrate|drizzle-kit migrate/i);
    expect(readme).toMatch(/ADR-092|baseline/i);
  });
});
