#!/usr/bin/env python3
"""Generate a schema snapshot SQL file from the Supabase production database
using the Supabase Management API (no database password needed)."""

import json
import os
import urllib.request
import urllib.error
import sys

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")
if not TOKEN or not PROJECT_REF:
    print("Error: Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF env vars.", file=sys.stderr)
    sys.exit(1)
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
OUTPUT_FILE = "supabase/schema_snapshot.sql"


def query(sql):
    """Execute a SQL query via the Management API and return rows as list of dicts."""
    payload = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "supabase-cli/2.107.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  [WARN] Query failed ({e.code}): {body[:200]}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  [WARN] Query error: {e}", file=sys.stderr)
        return []


def main():
    lines = []
    lines.append("-- ============================================================")
    lines.append("-- Schema Snapshot (auto-generated from production database)")
    lines.append(f"-- Project: {PROJECT_REF}")
    lines.append("-- This file is a READ-ONLY reference of the current DB schema.")
    lines.append("-- It is NOT a migration file. Do NOT execute against any DB.")
    lines.append("-- ============================================================")
    lines.append("")

    # ── Extensions ──────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Extensions")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT extname, nspname AS schema "
        "FROM pg_extension e "
        "JOIN pg_namespace n ON n.oid = e.extnamespace "
        "WHERE extname NOT IN ('plpgsql') "
        "ORDER BY extname;"
    )
    for r in rows:
        lines.append(f"CREATE EXTENSION IF NOT EXISTS {r['extname']} SCHEMA {r['schema']};")
    lines.append("")

    # ── Enum Types ──────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Enum Types")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT t.typname, "
        "string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) AS vals "
        "FROM pg_type t "
        "JOIN pg_enum e ON e.enumtypid = t.oid "
        "JOIN pg_namespace n ON n.oid = t.typnamespace "
        "WHERE n.nspname = 'public' AND t.typtype = 'e' "
        "GROUP BY t.typname ORDER BY t.typname;"
    )
    for r in rows:
        lines.append(f"CREATE TYPE {r['typname']} AS ENUM ({r['vals']});")
    lines.append("")

    # ── Tables (columns) ────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Tables")
    lines.append("-- ============================================================")
    col_rows = query(
        "SELECT c.table_name, c.column_name, c.data_type, c.character_maximum_length, "
        "c.numeric_precision, c.numeric_scale, c.is_nullable, c.column_default, c.ordinal_position "
        "FROM information_schema.columns c "
        "JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema "
        "WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' "
        "ORDER BY c.table_name, c.ordinal_position;"
    )

    # Group columns by table
    tables = {}
    for r in col_rows:
        t = r["table_name"]
        if t not in tables:
            tables[t] = []
        tables[t].append(r)

    # Get primary keys
    pk_rows = query(
        "SELECT tc.table_name, kcu.column_name "
        "FROM information_schema.table_constraints tc "
        "JOIN information_schema.key_column_usage kcu "
        "  ON tc.constraint_name = kcu.constraint_name "
        "WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' "
        "ORDER BY tc.table_name, kcu.ordinal_position;"
    )
    pks = {}
    for r in pk_rows:
        t = r["table_name"]
        if t not in pks:
            pks[t] = []
        pks[t].append(r["column_name"])

    for table_name in sorted(tables.keys()):
        cols = tables[table_name]
        lines.append(f"CREATE TABLE {table_name} (")
        col_lines = []
        for c in cols:
            col_def = f"  {c['column_name']} "
            dt = c["data_type"]
            if c["character_maximum_length"]:
                col_def += f"{dt}({c['character_maximum_length']})"
            elif c["numeric_precision"] and "numeric" in dt:
                if c["numeric_scale"]:
                    col_def += f"{dt}({c['numeric_precision']},{c['numeric_scale']})"
                else:
                    col_def += f"{dt}({c['numeric_precision']})"
            else:
                col_def += dt
            if c["column_default"]:
                col_def += f" DEFAULT {c['column_default']}"
            if c["is_nullable"] == "NO":
                col_def += " NOT NULL"
            col_lines.append(col_def)
        if table_name in pks:
            col_lines.append(f"  PRIMARY KEY ({', '.join(pks[table_name])})")
        lines.append(",\n".join(col_lines))
        lines.append(");")
        lines.append("")

    # ── Foreign Keys ────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Foreign Keys")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT conname, conrelid::regclass::text AS table_name, "
        "pg_get_constraintdef(oid) AS def "
        "FROM pg_constraint "
        "WHERE contype = 'f' AND connamespace = 'public'::regnamespace "
        "ORDER BY conrelid::regclass::text, conname;"
    )
    for r in rows:
        lines.append(f"ALTER TABLE {r['table_name']} ADD CONSTRAINT {r['conname']} {r['def']};")
    lines.append("")

    # ── Unique Constraints ──────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Unique Constraints")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT conname, conrelid::regclass::text AS table_name, "
        "pg_get_constraintdef(oid) AS def "
        "FROM pg_constraint "
        "WHERE contype = 'u' AND connamespace = 'public'::regnamespace "
        "ORDER BY conrelid::regclass::text, conname;"
    )
    for r in rows:
        lines.append(f"ALTER TABLE {r['table_name']} ADD CONSTRAINT {r['conname']} {r['def']};")
    lines.append("")

    # ── Check Constraints ───────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Check Constraints")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT conname, conrelid::regclass::text AS table_name, "
        "pg_get_constraintdef(oid) AS def "
        "FROM pg_constraint "
        "WHERE contype = 'c' AND connamespace = 'public'::regnamespace "
        "AND conrelid != 0 "
        "ORDER BY conrelid::regclass::text, conname;"
    )
    for r in rows:
        lines.append(f"ALTER TABLE {r['table_name']} ADD CONSTRAINT {r['conname']} {r['def']};")
    lines.append("")

    # ── Indexes ─────────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Indexes")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT indexdef FROM pg_indexes "
        "WHERE schemaname = 'public' "
        "ORDER BY tablename, indexname;"
    )
    for r in rows:
        lines.append(r["indexdef"] + ";")
    lines.append("")

    # ── Functions ───────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Functions")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT pg_get_functiondef(p.oid) AS def "
        "FROM pg_proc p "
        "JOIN pg_namespace n ON n.oid = p.pronamespace "
        "WHERE n.nspname = 'public' "
        "ORDER BY p.proname;"
    )
    for r in rows:
        lines.append(r["def"].strip())
        lines.append("")

    # ── Views ───────────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Views")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT table_name, pg_get_viewdef(table_name::regclass, true) AS def "
        "FROM information_schema.views "
        "WHERE table_schema = 'public' "
        "ORDER BY table_name;"
    )
    for r in rows:
        lines.append(f"CREATE VIEW {r['table_name']} AS")
        lines.append(r["def"].strip())
        lines.append("")
    if not rows:
        lines.append("-- (no views)")
        lines.append("")

    # ── Triggers ────────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Triggers")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT pg_get_triggerdef(oid) AS def "
        "FROM pg_trigger "
        "WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace) "
        "AND NOT tgisinternal "
        "ORDER BY tgrelid::regclass::text, tgname;"
    )
    for r in rows:
        lines.append(r["def"].strip() + ";")
    if not rows:
        lines.append("-- (no triggers)")
    lines.append("")

    # ── RLS Policies ────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Row Level Security (RLS) Policies")
    lines.append("-- ============================================================")
    # First, which tables have RLS enabled
    rls_tables = query(
        "SELECT relname FROM pg_class "
        "WHERE relnamespace = 'public'::regnamespace "
        "AND relkind = 'r' AND relrowsecurity = true "
        "ORDER BY relname;"
    )
    for r in rls_tables:
        lines.append(f"ALTER TABLE {r['relname']} ENABLE ROW LEVEL SECURITY;")
    if rls_tables:
        lines.append("")

    rows = query(
        "SELECT tablename, policyname, permissive, roles, cmd, qual, with_check "
        "FROM pg_policies "
        "WHERE schemaname = 'public' "
        "ORDER BY tablename, policyname;"
    )
    for r in rows:
        raw_roles = r["roles"] if r["roles"] else "{}"
        # pg_policies returns roles as a PostgreSQL array literal like {public} or {authenticated}
        roles = raw_roles.strip("{}") if raw_roles.startswith("{") else raw_roles
        if not roles:
            roles = "PUBLIC"
        cmd = r["cmd"].upper()
        qual = r["qual"]
        with_check = r["with_check"]
        lines.append(
            f"CREATE POLICY {r['policyname']} ON {r['tablename']} "
            f"AS {r['permissive']} FOR {cmd} TO {roles}"
        )
        if qual:
            lines.append(f"  USING ({qual})")
        if with_check:
            lines.append(f"  WITH CHECK ({with_check})")
        lines.append(";")
        lines.append("")
    if not rows:
        lines.append("-- (no RLS policies)")
        lines.append("")

    # ── Sequences ───────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- Sequences")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT sequence_name FROM information_schema.sequences "
        "WHERE sequence_schema = 'public' "
        "ORDER BY sequence_name;"
    )
    for r in rows:
        lines.append(f"-- Sequence: {r['sequence_name']}")
    if not rows:
        lines.append("-- (no standalone sequences)")
    lines.append("")

    # ── Cron Jobs ───────────────────────────────────────────────
    lines.append("-- ============================================================")
    lines.append("-- pg_cron Jobs")
    lines.append("-- ============================================================")
    rows = query(
        "SELECT jobname, schedule, command, active "
        "FROM cron.job ORDER BY jobname;"
    )
    for r in rows:
        active_str = "" if r["active"] else ", schedule => false"
        lines.append(
            f"SELECT cron.schedule('{r['jobname']}', "
            f"'{r['schedule']}', "
            f"$${r['command']}$${active_str});"
        )
    if not rows:
        lines.append("-- (no cron jobs)")
    lines.append("")

    # ── Write output ────────────────────────────────────────────
    output = "\n".join(lines)
    with open(OUTPUT_FILE, "w") as f:
        f.write(output)

    print(f"Schema snapshot written to {OUTPUT_FILE}")
    print(f"Total lines: {len(lines)}")


if __name__ == "__main__":
    main()
