# -*- coding: utf-8 -*-
"""Migrate documentation from Prisma to Drizzle ORM + enhance ARDs with DB design."""
from pathlib import Path
import re

ROOT = Path(r"C:\Users\Hadi\Desktop\projects\kasbino")

# Files that intentionally mention banned ORMs — rewrite manually later if needed
PROTECT_PREFIXES = (
    "docs/tech/drizzle-orm.md",
    "docs/rules/drizzle-rules.md",
)


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content.rstrip() + "\n", encoding="utf-8")
    print("wrote", p.relative_to(ROOT))


def transform(text: str) -> str:
    """Replace Prisma-as-approved-stack with Drizzle; keep banned-ORM lists intact via placeholders."""
    placeholders = {}

    def protect(match: re.Match) -> str:
        key = f"__PROTECT_{len(placeholders)}__"
        placeholders[key] = match.group(0)
        return key

    # Protect sentences that list banned ORMs
    protected = re.sub(
        r"[^\n]*(?:Prisma|TypeORM|Sequelize|MikroORM|Objection)[^\n]*(?:forbidden|banned|No alternative|not allowed|or others)[^\n]*",
        protect,
        text,
        flags=re.IGNORECASE,
    )
    protected = re.sub(
        r"[^\n]*alternative ORM[^\n]*",
        protect,
        protected,
        flags=re.IGNORECASE,
    )
    protected = re.sub(
        r"- Prisma, TypeORM, Sequelize, MikroORM, Objection[^\n]*",
        protect,
        protected,
    )

    reps = [
        ("Prisma ORM", "Drizzle ORM"),
        ("Prisma + PostgreSQL connection", "Drizzle ORM + PostgreSQL connection"),
        ("Prisma + PostgreSQL", "Drizzle ORM + PostgreSQL"),
        ("Add Prisma schema baseline", "Add Drizzle schema baseline"),
        ("Prisma schema baseline", "Drizzle schema baseline"),
        ("Prisma, Redis", "Drizzle, Redis"),
        ("Prisma repository impl", "Drizzle repository impl"),
        ("Prisma repositories", "Drizzle repositories"),
        ("prisma repos", "drizzle repos"),
        ("Prisma models", "Drizzle schemas"),
        ("Prisma Client", "Drizzle db client"),
        ("Prisma migrate", "Drizzle Kit migrate"),
        ("Prisma TX", "Drizzle TX"),
        ("Prisma parameterized", "Drizzle parameterized"),
        ("Prisma only (no string SQL)", "Drizzle only (parameterized; no string-concat SQL)"),
        ("No domain imports of Prisma/Next/React", "No domain imports of Drizzle/Next/React"),
        ("Next.js / Prisma / React", "Next.js / Drizzle / React"),
        ("Migrations via Prisma only.", "Migrations via Drizzle Kit only."),
        ("Migrations only via Prisma", "Migrations only via Drizzle Kit"),
        ("Shared Prisma client", "Shared Drizzle client"),
        ("N+1 Prisma queries", "N+1 SQL/Drizzle queries"),
        ("Interfaces in domain; Prisma impl in infrastructure", "Interfaces in domain; Drizzle impl in infrastructure"),
        ("prisma/schema.prisma", "src/infrastructure/database/schema/"),
        ("SQL migrations in prisma/migrations", "SQL migrations in src/infrastructure/database/migrations/"),
        ("persistence/    # Prisma repository impl", "persistence/    # Drizzle repository impl"),
        ("Next.js, TS, Prisma, Tailwind", "Next.js, TS, Drizzle ORM, Tailwind"),
        ("## Prisma\n", "## Drizzle ORM\n"),
        ("Prisma", "Drizzle"),
        ("prisma", "drizzle"),
    ]
    out = protected
    for a, b in reps:
        out = out.replace(a, b)
    for k, v in placeholders.items():
        out = out.replace(k, v)
    return out


changed = 0
for path in ROOT.rglob("*"):
    if not path.is_file():
        continue
    if path.suffix.lower() not in {".md", ".mdc"}:
        continue
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    if rel in PROTECT_PREFIXES or rel.startswith("docs/execution/_migrate"):
        continue
    if path.name.startswith("_migrate"):
        continue
    original = read(path)
    updated = transform(original)
    if updated != original:
        write(path, updated)
        changed += 1

print("transformed files:", changed)

prisma_doc = ROOT / "docs/tech/prisma.md"
if prisma_doc.exists():
    # If transform renamed content awkwardly, still delete prisma tech guide
    prisma_doc.unlink()
    print("deleted docs/tech/prisma.md")

# Fix tech README
tech_readme = ROOT / "docs/tech/README.md"
tr = read(tech_readme)
# Remove any prisma line; ensure drizzle line
lines = []
for line in tr.splitlines():
    if "prisma.md" in line.lower():
        continue
    lines.append(line)
tr = "\n".join(lines)
if "drizzle-orm.md" not in tr:
    tr = tr.replace(
        "| PostgreSQL | [postgresql.md](./postgresql.md) |",
        "| PostgreSQL | [postgresql.md](./postgresql.md) |\n| Drizzle ORM | [drizzle-orm.md](./drizzle-orm.md) |",
    )
write(tech_readme, tr)

# Fix postgresql.md if purpose duplicated
pg_path = ROOT / "docs/tech/postgresql.md"
pg = read(pg_path)
pg = pg.replace("drizzle/schema.prisma", "src/infrastructure/database/schema/")
if "Drizzle ORM" not in pg.split("\n")[0:20].__str__():
    pass
if "Mandatory access layer: **Drizzle ORM**" not in pg:
    pg = pg.replace(
        "## Why chosen",
        "Mandatory access layer: **Drizzle ORM** (see `drizzle-orm.md`). No other ORM.\n\n## Why chosen",
        1,
    )
write(pg_path, pg)

print("phase1 done")
