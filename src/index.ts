import { Cron } from "croner";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface CronEntry {
  path: string;
  schedule: string;
}

interface VercelConfig {
  crons?: CronEntry[];
}

const BASE_URL = process.env.BASE_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const CONFIG_PATH = process.env.CONFIG_PATH || process.cwd();

if (!BASE_URL) {
  console.error("[vercel-cron-runner] BASE_URL environment variable is required");
  process.exit(1);
}

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadConfig(): Promise<VercelConfig> {
  const jsonPath = resolve(CONFIG_PATH, "vercel.json");
  const tsPath = resolve(CONFIG_PATH, "vercel.ts");

  if (await fileExists(jsonPath)) {
    log(`Loading config from ${jsonPath}`);
    try {
      const content = await readFile(jsonPath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`[vercel-cron-runner] Failed to parse ${jsonPath}: ${error}`);
      process.exit(1);
    }
  }

  if (await fileExists(tsPath)) {
    log(`Loading config from ${tsPath}`);
    try {
      const mod = await import(pathToFileURL(tsPath).href) as Record<string, unknown>;
      return (mod.config ?? mod.default ?? mod) as VercelConfig;
    } catch (error) {
      console.error(`[vercel-cron-runner] Failed to load ${tsPath}: ${error}`);
      process.exit(1);
    }
  }

  console.error(`[vercel-cron-runner] No vercel.json or vercel.ts found in ${CONFIG_PATH}`);
  process.exit(1);
}

async function triggerCron(entry: CronEntry) {
  const url = `${BASE_URL}${entry.path}`;
  const start = performance.now();

  try {
    const headers: Record<string, string> = {};
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }

    const response = await fetch(url, { headers });
    const duration = (performance.now() - start).toFixed(0);
    log(`${entry.path} → ${response.status} (${duration}ms)`);
  } catch (error) {
    const duration = (performance.now() - start).toFixed(0);
    log(`${entry.path} → ERROR (${duration}ms): ${error}`);
  }
}

const config = await loadConfig();

if (!config.crons || !Array.isArray(config.crons) || config.crons.length === 0) {
  console.error("[vercel-cron-runner] No crons found in config");
  process.exit(1);
}

for (const entry of config.crons) {
  if (!entry.path || !entry.schedule) {
    console.error(`[vercel-cron-runner] Invalid cron entry: ${JSON.stringify(entry)}`);
    process.exit(1);
  }
}

log(`Starting vercel-cron-runner with ${config.crons.length} cron(s):`);
for (const entry of config.crons) {
  log(`  ${entry.schedule} → ${entry.path}`);
}

const jobs: Cron[] = [];

for (const entry of config.crons) {
  const job = new Cron(entry.schedule, { timezone: "UTC" }, () => {
    triggerCron(entry);
  });
  jobs.push(job);
}

function shutdown() {
  log("Shutting down...");
  for (const job of jobs) {
    job.stop();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
