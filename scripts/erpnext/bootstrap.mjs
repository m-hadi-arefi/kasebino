#!/usr/bin/env node
/**
 * Bootstrap local ERPNext for MerchantOS (ADR-140).
 *
 * Prerequisites:
 *   docker compose -f docker-compose.erpnext.yml up -d
 *   Wait for create-site to finish, then complete Setup Wizard once in browser
 *   (Administrator / admin) with currency IRR if prompted.
 *
 * Usage:
 *   npm run erpnext:bootstrap
 */

import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = (process.env.MOS_ERPNEXT_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const SITE = "frontend";
const COMPANY = process.env.MOS_ERPNEXT_COMPANY ?? "MerchantOS Demo";
const WAREHOUSE_FALLBACK =
  process.env.MOS_ERPNEXT_WAREHOUSE ?? "Stores - MD";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  });
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || "").trim();
    throw new Error(err || `${cmd} ${args.join(" ")} failed`);
  }
  return (res.stdout || "").trim();
}

async function waitForHttp(url) {
  console.log(`Waiting for ${url} ...`);
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(url);
      if (res.status > 0) {
        console.log(`OK HTTP ${res.status}`);
        return;
      }
    } catch {
      // retry
    }
    process.stdout.write(".");
    await sleep(5000);
  }
  throw new Error("ERPNext frontend not reachable");
}

const PY = `
import frappe
frappe.init(site="${SITE}", sites_path="sites")
frappe.connect()
frappe.set_user("Administrator")

company_name = ${JSON.stringify(COMPANY)}
if not frappe.db.exists("Company", company_name):
    companies = frappe.get_all("Company", pluck="name")
    if companies:
        company_name = companies[0]
        print("USING_EXISTING_COMPANY=" + company_name)
    else:
        try:
            from frappe.desk.page.setup_wizard.setup_wizard import setup_complete
            setup_complete({
                "language": "fa",
                "country": "Iran",
                "timezone": "Asia/Tehran",
                "currency": "IRR",
                "full_name": "Administrator",
                "email": "admin@example.com",
                "company_name": company_name,
                "company_abbr": "MD",
            })
            frappe.db.commit()
            print("CREATED_COMPANY=" + company_name)
        except Exception as e:
            print("SETUP_COMPLETE_ERR=" + str(e))
            print("NO_COMPANY_COMPLETE_SETUP_WIZARD")
else:
    print("COMPANY=" + company_name)

if frappe.db.exists("Company", company_name):
    if not frappe.db.exists("Customer", {"customer_name": "Cash Customer"}):
        try:
            frappe.get_doc({
                "doctype": "Customer",
                "customer_name": "Cash Customer",
                "customer_type": "Individual",
                "customer_group": "All Customer Groups",
                "territory": "All Territories",
            }).insert(ignore_permissions=True)
            frappe.db.commit()
            print("CREATED_CASH_CUSTOMER")
        except Exception as e:
            print("CASH_CUSTOMER_ERR=" + str(e))

user = frappe.get_doc("User", "Administrator")
from frappe.utils import random_string
api_secret = random_string(15)
if not user.api_key:
    user.api_key = random_string(15)
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()
print("API_KEY=" + user.api_key)
print("API_SECRET=" + api_secret)

wh = None
if frappe.db.exists("Company", company_name):
    wh = frappe.db.get_value("Warehouse", {"company": company_name, "is_group": 0}, "name")
print("WAREHOUSE=" + (wh or ${JSON.stringify(WAREHOUSE_FALLBACK)}))
print("COMPANY_FINAL=" + (company_name or ""))
frappe.destroy()
`;

async function main() {
  console.log("MerchantOS → ERPNext bootstrap\n");
  run("docker", ["compose", "-f", "docker-compose.erpnext.yml", "ps"]);
  await waitForHttp(BASE);

  const localPy = join(tmpdir(), `mos-erpnext-bootstrap-${Date.now()}.py`);
  writeFileSync(localPy, PY, "utf8");
  try {
    execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "docker-compose.erpnext.yml",
        "cp",
        localPy,
        "backend:/tmp/mos_erpnext_bootstrap.py",
      ],
      { stdio: "inherit" },
    );

    // Run inside bench env
    const out = run("docker", [
      "compose",
      "-f",
      "docker-compose.erpnext.yml",
      "exec",
      "-T",
      "backend",
      "bash",
      "-lc",
      "cd /home/frappe/frappe-bench && source env/bin/activate && python /tmp/mos_erpnext_bootstrap.py",
    ]);
    console.log(out);

    if (out.includes("NO_COMPANY_COMPLETE_SETUP_WIZARD")) {
      console.log(`\nOpen ${BASE} as Administrator/admin and finish Setup Wizard (IRR).`);
      console.log("Then re-run: npm run erpnext:bootstrap\n");
      process.exitCode = 2;
      return;
    }

    const apiKey = /API_KEY=(.+)/.exec(out)?.[1]?.trim() ?? "";
    const apiSecret = /API_SECRET=(.+)/.exec(out)?.[1]?.trim() ?? "";
    const company =
      /COMPANY_FINAL=(.+)/.exec(out)?.[1]?.trim() ||
      /USING_EXISTING_COMPANY=(.+)/.exec(out)?.[1]?.trim() ||
      COMPANY;
    const warehouse = /WAREHOUSE=(.+)/.exec(out)?.[1]?.trim() || WAREHOUSE_FALLBACK;

    console.log("\n# Paste into MerchantOS .env (never NEXT_PUBLIC_*):");
    console.log("MOS_ACCOUNTING_PROVIDER=erpnext");
    console.log(`MOS_ERPNEXT_URL=${BASE}`);
    console.log(`MOS_ERPNEXT_API_KEY=${apiKey}`);
    console.log(`MOS_ERPNEXT_API_SECRET=${apiSecret}`);
    console.log(`MOS_ERPNEXT_COMPANY=${company}`);
    console.log(`MOS_ERPNEXT_WAREHOUSE=${warehouse}`);
    console.log("MOS_ERPNEXT_DEFAULT_CUSTOMER=Cash Customer");
    console.log("MOS_ERPNEXT_CURRENCY=IRR");
    console.log("\nStart worker: npm run worker:outbox");
  } finally {
    try {
      unlinkSync(localPy);
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
