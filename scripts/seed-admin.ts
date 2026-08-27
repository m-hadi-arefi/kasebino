import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://merchantos:merchantos@localhost:5433/merchantos";

async function main() {
  console.log(`Connecting to database at ${databaseUrl.replace(/:[^:@]+@/, ":****@")}...`);
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const adminPhone = "09120000000";
    const adminId = "a0000000-0000-4000-8000-000000000001";
    const now = new Date();

    const authUsers = await sql`
      SELECT id FROM auth_users WHERE phone_national = ${adminPhone} LIMIT 1
    `;
    const targetAdminId = authUsers.length > 0 ? authUsers[0].id : adminId;

    await sql`
      INSERT INTO admin_users (id, login, display_name, status, role, created_at, updated_at)
      VALUES (${targetAdminId}, ${adminPhone}, 'مدیر پلتفرم کاسبینو', 'active', 'platform_admin', ${now}, ${now})
      ON CONFLICT (login) DO UPDATE SET
        id = ${targetAdminId},
        status = 'active',
        role = 'platform_admin',
        updated_at = ${now}
    `;
    console.log(`✅ Platform admin seeded/synced: ${adminPhone} (${targetAdminId})`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("❌ Failed to seed admin user:", err);
  process.exit(1);
});
