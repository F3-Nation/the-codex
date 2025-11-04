import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

function ensureMigrationsDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveCliPath(): string {
  const cliPath = path.resolve(
    process.cwd(),
    "node_modules",
    "node-pg-migrate",
    "bin",
    "node-pg-migrate.js",
  );

  if (!fs.existsSync(cliPath)) {
    throw new Error(
      "Unable to locate node-pg-migrate CLI. Did you install dependencies?",
    );
  }

  return cliPath;
}

function buildArguments(
  name: string,
  additionalArgs: string[],
  migrationsDir: string,
): string[] {
  return ["create", name, "--migrations-dir", migrationsDir, ...additionalArgs];
}

function main(): void {
  const args = process.argv.slice(2);
  const migrationName = args.shift();

  if (!migrationName) {
    console.error(
      "Usage: npm run db:generate:migration -- <migration-name> [node-pg-migrate options]",
    );
    process.exit(1);
  }

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  ensureMigrationsDir(migrationsDir);

  const cliPath = resolveCliPath();
  const cliArgs = buildArguments(migrationName, args, migrationsDir);

  const child = spawn(process.execPath, [cliPath, ...cliArgs], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.info(`Created migration "${migrationName}" in ${migrationsDir}.`);
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error("Failed to spawn node-pg-migrate CLI.");
    console.error(error);
    process.exit(1);
  });
}

main();
