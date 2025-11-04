import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import runner from "node-pg-migrate";
import type { Logger } from "node-pg-migrate/dist/types";

type MigrationCommand = "up" | "down" | "redo";

interface CliOptions {
  count?: number;
  file?: string;
  dryRun?: boolean;
  fake?: boolean;
  verbose?: boolean;
}

function loadEnvFiles(): void {
  const envFiles = [".env", ".env.local"];

  for (const fileName of envFiles) {
    const absolutePath = path.resolve(process.cwd(), fileName);
    if (fs.existsSync(absolutePath)) {
      dotenv.config({ path: absolutePath, override: false });
    }
  }
}

function parseArgs(argv: string[]): {
  command: MigrationCommand;
  options: CliOptions;
} {
  const args = [...argv];
  let command: MigrationCommand = "up";

  if (args[0] && !args[0].startsWith("--")) {
    const candidate = args.shift()!;
    if (candidate === "up" || candidate === "down" || candidate === "redo") {
      command = candidate;
    } else {
      throw new Error(
        `Unknown migration command "${candidate}". Use "up", "down", or "redo".`,
      );
    }
  }

  const options: CliOptions = {};

  while (args.length > 0) {
    const token = args.shift()!;

    if (token === "--count") {
      const value = args.shift();
      if (!value) {
        throw new Error('The "--count" option requires a numeric value.');
      }
      options.count = parseCount(value);
    } else if (token.startsWith("--count=")) {
      options.count = parseCount(token.split("=")[1] ?? "");
    } else if (token === "--file") {
      const value = args.shift();
      if (!value) {
        throw new Error('The "--file" option requires a migration filename.');
      }
      options.file = value;
    } else if (token.startsWith("--file=")) {
      options.file = token.split("=")[1];
    } else if (token === "--dry-run") {
      options.dryRun = true;
    } else if (token === "--fake") {
      options.fake = true;
    } else if (token === "--verbose") {
      options.verbose = true;
    } else {
      throw new Error(`Unknown option "${token}".`);
    }
  }

  return { command, options };
}

function parseCount(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(
      `Invalid count "${raw}". Count must be a positive integer.`,
    );
  }
  return parsed;
}

function createLogger(verbose: boolean | undefined): Logger {
  return {
    debug: verbose ? console.debug.bind(console) : () => undefined,
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
}

interface PreparedMigrationsDir {
  dir: string;
  cleanup: () => void;
}

const MIGRATION_PRIORITY: Record<string, number> = {
  ".ts": 0,
  ".cjs": 1,
  ".mjs": 2,
  ".js": 3,
  ".sql": 4,
};

function isSupportedMigrationFile(fileName: string): boolean {
  const ext = path.extname(fileName);
  return Object.prototype.hasOwnProperty.call(MIGRATION_PRIORITY, ext);
}

function selectMigrationFiles(
  migrationsDir: string,
): { fileName: string; absolutePath: string; priority: number }[] {
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const selections = new Map<
    string,
    { fileName: string; absolutePath: string; priority: number }
  >();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!isSupportedMigrationFile(entry.name)) continue;

    const baseName = path.basename(entry.name, ext);
    const candidate = {
      fileName: entry.name,
      absolutePath: path.join(migrationsDir, entry.name),
      priority: MIGRATION_PRIORITY[ext],
    };

    const existing = selections.get(baseName);
    if (!existing || candidate.priority < existing.priority) {
      selections.set(baseName, candidate);
    }
  }

  return Array.from(selections.values()).sort((a, b) =>
    a.fileName.localeCompare(b.fileName),
  );
}

function prepareMigrationsDirectory(
  migrationsDir: string,
  verbose?: boolean,
): PreparedMigrationsDir {
  const selectedFiles = selectMigrationFiles(migrationsDir);

  const duplicatesFiltered =
    selectedFiles.length !==
    fs.readdirSync(migrationsDir).filter((entry) => {
      const ext = path.extname(entry);
      return (
        isSupportedMigrationFile(entry) &&
        fs.statSync(path.join(migrationsDir, entry)).isFile()
      );
    }).length;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-migrations-"));
  for (const file of selectedFiles) {
    const destination = path.join(tempDir, file.fileName);
    fs.copyFileSync(file.absolutePath, destination);
  }

  if (verbose && duplicatesFiltered) {
    console.info(
      "[db:migrate] Filtered duplicate migration files by basename.",
    );
  }

  return {
    dir: tempDir,
    cleanup: () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

async function runMigrations(
  direction: "up" | "down",
  options: CliOptions,
  databaseUrl: string,
  migrationsDir: string,
): Promise<void> {
  const logger = createLogger(options.verbose);
  const preparedDir = prepareMigrationsDirectory(
    migrationsDir,
    options.verbose,
  );
  let executed;

  try {
    executed = await runner({
      databaseUrl,
      dir: preparedDir.dir,
      migrationsTable: "pgmigrations",
      direction,
      count: options.count ?? (direction === "down" ? 1 : undefined),
      file: options.file,
      dryRun: options.dryRun,
      fake: options.fake,
      logger,
      verbose: options.verbose,
    });
  } finally {
    preparedDir.cleanup();
  }

  if (options.dryRun) {
    console.info(
      `[db:migrate ${direction}] Dry run complete. ${executed.length} migration(s) would run.`,
    );
    return;
  }

  if (executed.length === 0) {
    console.info(`[db:migrate ${direction}] No migrations executed.`);
    return;
  }

  console.info(
    `[db:migrate ${direction}] Executed ${executed.length} migration(s): ${executed
      .map((migration) => migration.name)
      .join(", ")}`,
  );
}

async function main(): Promise<void> {
  loadEnvFiles();

  const { command, options } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please ensure your environment is configured before running migrations.",
    );
  }

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at ${migrationsDir}.`);
  }

  if (command === "redo") {
    await runMigrations(
      "down",
      { ...options, count: options.count ?? 1 },
      databaseUrl,
      migrationsDir,
    );
    await runMigrations("up", { ...options }, databaseUrl, migrationsDir);
    return;
  }

  await runMigrations(command, options, databaseUrl, migrationsDir);
}

main().catch((error) => {
  console.error("[db:migrate] Migration command failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
