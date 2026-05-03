import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readCollection<T>(name: string): T[] {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T[];
  } catch {
    return [];
  }
}

export function readSingle<T>(name: string, defaultValue: T): T {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

export function writeCollection<T>(name: string, data: T[]): void {
  ensureDataDir();
  fs.writeFileSync(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export function writeSingle<T>(name: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

export function generateId(): string {
  return crypto.randomUUID();
}
