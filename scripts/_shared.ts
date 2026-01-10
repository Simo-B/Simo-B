import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';

export type CliArgs = {
  _: string[];
  [key: string]: string | boolean | string[] | undefined;
};

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CliArgs {
  const args: CliArgs = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token) continue;

    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const eqIdx = token.indexOf('=');
    if (eqIdx !== -1) {
      const key = token.slice(2, eqIdx);
      const value = token.slice(eqIdx + 1);
      args[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadEnvFromDisk(options?: {
  envFile?: string;
  mode?: 'local' | 'production';
}): Promise<string[]> {
  const cwd = process.cwd();
  const candidates: string[] = [];

  if (options?.envFile) {
    candidates.push(path.resolve(cwd, options.envFile));
  } else if (options?.mode === 'production') {
    candidates.push(
      path.resolve(cwd, '.env.production.local'),
      path.resolve(cwd, '.env.production'),
      path.resolve(cwd, '.env.local'),
      path.resolve(cwd, '.env')
    );
  } else {
    candidates.push(
      path.resolve(cwd, '.env.local'),
      path.resolve(cwd, '.env'),
      path.resolve(cwd, '.env.production.local'),
      path.resolve(cwd, '.env.production')
    );
  }

  const loaded: string[] = [];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      const result = dotenv.config({ path: candidate });
      if (result.error) {
        throw result.error;
      }
      loaded.push(path.relative(cwd, candidate));
      break;
    }
  }

  return loaded;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required but was not set`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value || undefined;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function formatHeading(title: string): string {
  return `\n=== ${title} ===`;
}
