"""
Database Schema Migration Script for EdgeVision AI.

Safely checks and adds newly introduced tables and columns to existing
Postgres or SQLite databases without data loss.
"""
import argparse
from sqlalchemy import create_engine, inspect, text
from app.database import Base


def column_exists(inspector, table, column):
    try:
        return column in [c["name"] for c in inspector.get_columns(table)]
    except Exception:
        return False


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
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine = create_engine(db_url, connect_args=connect_args)
    inspector = inspect(engine)

    # First ensure all tables exist
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    statements = []

    # Check violations columns
    if "violations" in tables:
        if not column_exists(inspector, "violations", "worker_track_id"):
            statements.append("ALTER TABLE violations ADD COLUMN worker_track_id VARCHAR")
        if not column_exists(inspector, "violations", "acknowledged"):
            default = "0" if is_sqlite else "false"
            statements.append(f"ALTER TABLE violations ADD COLUMN acknowledged BOOLEAN DEFAULT {default}")
        if not column_exists(inspector, "violations", "acknowledged_by"):
            statements.append("ALTER TABLE violations ADD COLUMN acknowledged_by VARCHAR")
        if not column_exists(inspector, "violations", "resolved_by"):
            statements.append("ALTER TABLE violations ADD COLUMN resolved_by VARCHAR")
        if not column_exists(inspector, "violations", "resolved_at"):
            statements.append("ALTER TABLE violations ADD COLUMN resolved_at TIMESTAMP")
        if not column_exists(inspector, "violations", "evidence_url"):
            statements.append("ALTER TABLE violations ADD COLUMN evidence_url VARCHAR")
        if not column_exists(inspector, "violations", "notes"):
            statements.append("ALTER TABLE violations ADD COLUMN notes TEXT")

    # Check cameras columns
    if "cameras" in tables:
        if not column_exists(inspector, "cameras", "source_type"):
            statements.append("ALTER TABLE cameras ADD COLUMN source_type VARCHAR DEFAULT 'local'")
        if not column_exists(inspector, "cameras", "status"):
            statements.append("ALTER TABLE cameras ADD COLUMN status VARCHAR DEFAULT 'online'")
        if not column_exists(inspector, "cameras", "fps"):
            statements.append("ALTER TABLE cameras ADD COLUMN fps FLOAT DEFAULT 15.0")
        if not column_exists(inspector, "cameras", "resolution"):
            statements.append("ALTER TABLE cameras ADD COLUMN resolution VARCHAR DEFAULT '1280x720'")

    # Check zones columns
    if "zones" in tables:
        if not column_exists(inspector, "zones", "shape_type"):
            statements.append("ALTER TABLE zones ADD COLUMN shape_type VARCHAR DEFAULT 'polygon'")
        if not column_exists(inspector, "zones", "rules"):
            statements.append("ALTER TABLE zones ADD COLUMN rules TEXT")

    if not statements:
        print("Schema already fully up to date.")
        return

    with engine.begin() as conn:
        for stmt in statements:
            print(f"Running: {stmt}")
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Warning: could not execute '{stmt}': {e}")

    print(f"\nMigration complete — {len(statements)} alteration(s) processed.")


if __name__ == "__main__":
    main()