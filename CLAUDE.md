# The Codex — project notes for Claude Code

Next.js app for the F3 Nation Exicon/Lexicon. Deep lessons live in
`.claude/skills/<name>/SKILL.md` and load on demand when a task matches their
description; this file stays short.

## Hard Rules

- **Prod is not what `migrations/` says**: production is the `codex` schema on
  the shared f3data Cloud SQL instance, owned by Drizzle in F3-Nation/f3-nation.
  Any DDL meant for prod is applied as `app_codex` through the proxy AND
  declared in the f3-nation Drizzle schema — never by running this repo's
  migrations against prod. → skill `codex-prod-database`

## Skills

- `codex-prod-database` — load when connecting to prod (DBeaver, psql, the
  Cloud SQL proxy), when a DATABASE_URL connection times out, before any
  DDL/migration work, or when touching `migrations/`, `db/`,
  `scripts/db-migrate.ts`, `src/lib/db.ts`, tags, or `user_submissions` ids.
