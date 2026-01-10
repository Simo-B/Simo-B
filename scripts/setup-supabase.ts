import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import {
  formatHeading,
  loadEnvFromDisk,
  optionalEnv,
  parseCliArgs,
  requireEnv,
} from './_shared';

type TableCheck = {
  table: string;
  ok: boolean;
  message?: string;
};

const REQUIRED_TABLES = ['users', 'analyses', 'analysis_results'] as const;

async function checkTables(options: {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}): Promise<TableCheck[]> {
  const admin = createClient(options.supabaseUrl, options.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: TableCheck[] = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table).select('*').limit(1);

    if (!error) {
      checks.push({ table, ok: true });
      continue;
    }

    checks.push({
      table,
      ok: false,
      message: error.message,
    });
  }

  return checks;
}

async function runSqlMigrations(dbUrl: string): Promise<void> {
  let pg: typeof import('pg');

  try {
    pg = await import('pg');
  } catch {
    throw new Error(
      'Missing dependency "pg". Install it (npm i -D pg @types/pg) or run migrations manually in Supabase SQL editor.'
    );
  }

  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log('No migration files found in supabase/migrations');
    return;
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');

      console.log(`\nRunning migration: ${file}`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    console.log(`Usage:
  npx tsx scripts/setup-supabase.ts [--env-file=.env.local]

This script:
  - Validates Supabase connectivity using SUPABASE_SERVICE_ROLE_KEY
  - Checks for required tables: ${REQUIRED_TABLES.join(', ')}
  - Optionally runs SQL migrations if SUPABASE_DB_URL is provided

Required env vars:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Optional env vars:
  SUPABASE_DB_URL (Postgres URI) - enables automated migrations
`);
    return;
  }

  const envFile = typeof args['env-file'] === 'string' ? args['env-file'] : undefined;
  await loadEnvFromDisk({ envFile, mode: 'local' });

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const dbUrl = optionalEnv('SUPABASE_DB_URL');

  console.log(formatHeading('Supabase connection'));
  console.log(`URL: ${supabaseUrl}`);

  console.log(formatHeading('Checking tables'));
  let checks = await checkTables({ supabaseUrl, supabaseServiceRoleKey });

  for (const check of checks) {
    if (check.ok) {
      console.log(`✅ ${check.table}`);
    } else {
      console.log(`❌ ${check.table}: ${check.message ?? 'unknown error'}`);
    }
  }

  const missing = checks.filter(c => !c.ok);

  if (missing.length === 0) {
    console.log('\nAll required tables exist.');
    return;
  }

  console.log(formatHeading('Missing tables detected'));
  console.log(`Missing: ${missing.map(m => m.table).join(', ')}`);

  if (!dbUrl) {
    console.log('\nSUPABASE_DB_URL is not set, so migrations cannot be applied automatically.');
    console.log('Manual migration instructions:');
    console.log('1) Supabase Dashboard → SQL Editor → New Query');
    console.log('2) Paste contents of supabase/migrations/00001_initial_schema.sql');
    console.log('3) Run the query');
    console.log('4) Re-run this script');
    process.exitCode = 1;
    return;
  }

  console.log(formatHeading('Running migrations'));
  await runSqlMigrations(dbUrl);

  console.log(formatHeading('Re-checking tables'));
  checks = await checkTables({ supabaseUrl, supabaseServiceRoleKey });

  for (const check of checks) {
    if (check.ok) {
      console.log(`✅ ${check.table}`);
    } else {
      console.log(`❌ ${check.table}: ${check.message ?? 'unknown error'}`);
    }
  }

  const stillMissing = checks.filter(c => !c.ok);

  if (stillMissing.length > 0) {
    throw new Error(`Some tables are still missing: ${stillMissing.map(t => t.table).join(', ')}`);
  }

  console.log('\nSupabase setup looks good.');
}

main().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
});
