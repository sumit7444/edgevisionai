"""
Adds columns introduced by the enterprise-dashboard update to an EXISTING
database, without touching existing rows. Safe to run repeatedly — it only
adds a column if it isn't already there.

Needed because SQLAlchemy's `Base.metadata.create_all()` (used in main.py)
only creates tables that don't exist yet; it never alters a table that's
already there. So any DB you were running before this update — including
your Neon production database, not just local SQLite — is still on the old
schema and needs these columns added by hand.

New columns this adds:
  violations.worker_track_id  (TEXT, nullable)
  violations.acknowledged     (BOOLEAN, default false)
  zones.shape_type            (TEXT, default 'polygon')

Usage:
  cd backend
  python migrate.py                     # uses DATABASE_URL from .env
  python migrate.py --database-url postgresql://...   # or pass explicitly
"""
import argparse
from sqlalchemy import create_engine, inspect, text


def column_exists(inspector, table, column):
    return column in [c["name"] for c in inspector.get_columns(table)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", default=None, help="overrides DATABASE_URL from .env")
    args = parser.parse_args()

    if args.database_url:
        db_url = args.database_url
    else:
        from app.config import settings
        db_url = settings.DATABASE_URL

    is_sqlite = db_url.startswith("sqlite")
    engine = create_engine(db_url)
    inspector = inspect(engine)

    if "violations" not in inspector.get_table_names():
        print("No 'violations' table found yet — nothing to migrate. It'll be created fresh on next backend start.")
        return

    statements = []

    if not column_exists(inspector, "violations", "worker_track_id"):
        statements.append("ALTER TABLE violations ADD COLUMN worker_track_id VARCHAR")

    if not column_exists(inspector, "violations", "acknowledged"):
        default = "0" if is_sqlite else "false"
        statements.append(f"ALTER TABLE violations ADD COLUMN acknowledged BOOLEAN DEFAULT {default}")

    if "zones" in inspector.get_table_names() and not column_exists(inspector, "zones", "shape_type"):
        statements.append("ALTER TABLE zones ADD COLUMN shape_type VARCHAR DEFAULT 'polygon'")

    if not statements:
        print("Schema already up to date — nothing to do.")
        return

    with engine.begin() as conn:
        for stmt in statements:
            print(f"Running: {stmt}")
            conn.execute(text(stmt))

    print(f"\nMigration complete — {len(statements)} column(s) added. No existing rows were modified.")


if __name__ == "__main__":
    main()