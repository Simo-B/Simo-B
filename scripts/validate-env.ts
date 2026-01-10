import fs from 'node:fs/promises';
import path from 'node:path';

import {
  formatHeading,
  loadEnvFromDisk,
  parseCliArgs,
  requireEnv,
} from './_shared';

type EnvVarSpec = {
  name: string;
  required: boolean;
  description: string;
  examples?: string[];
  formatHint?: string;
};

const ENV_SPECS: EnvVarSpec[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL (browser-safe).',
    examples: ['https://<project-ref>.supabase.co'],
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anon/public API key (browser-safe).',
    formatHint: 'JWT string (often starts with "eyJ")',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    description:
      'Supabase service_role key (server-only). Recommended for Stripe webhooks and admin scripts.',
    formatHint: 'JWT string (often starts with "eyJ")',
  },
  {
    name: 'SUPABASE_DB_URL',
    required: false,
    description:
      'Postgres connection string used by scripts to run migrations automatically (server-only).',
    formatHint: 'postgres://... connection URI',
  },
  {
    name: 'ALCHEMY_API_KEY',
    required: true,
    description: 'Alchemy API key used to fetch wallet transfer history.',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLIC_KEY',
    required: true,
    description: 'Stripe publishable key (browser-safe).',
    examples: ['pk_test_...', 'pk_live_...'],
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripe secret key (server-only).',
    examples: ['sk_test_...', 'sk_live_...'],
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    description: 'Stripe webhook signing secret for /api/stripe/webhook (server-only).',
    examples: ['whsec_...'],
  },
];

function parseEnvTemplateKeys(contents: string): Set<string> {
  const keys = new Set<string>();

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (key) keys.add(key);
  }

  return keys;
}

async function validateTemplate(fileName: string): Promise<void> {
  const filePath = path.resolve(process.cwd(), fileName);
  const contents = await fs.readFile(filePath, 'utf8');
  const keys = parseEnvTemplateKeys(contents);

  const missing = ENV_SPECS.filter(s => s.required).map(s => s.name).filter(k => !keys.has(k));

  if (missing.length > 0) {
    throw new Error(`${fileName} is missing required keys: ${missing.join(', ')}`);
  }
}

function validateRuntimeEnv(options: { requireServiceRoleKey?: boolean }): void {
  for (const spec of ENV_SPECS) {
    if (!spec.required) continue;
    requireEnv(spec.name);
  }

  if (options.requireServiceRoleKey) {
    requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  }
}

function printDocs(): void {
  console.log(formatHeading('Environment variables'));
  for (const spec of ENV_SPECS) {
    const flag = spec.required ? 'required' : 'optional';
    console.log(`- ${spec.name} (${flag}): ${spec.description}`);
    if (spec.formatHint) {
      console.log(`  Format: ${spec.formatHint}`);
    }
    if (spec.examples?.length) {
      console.log(`  Example: ${spec.examples.join(' | ')}`);
    }
  }
}

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    console.log(`Usage:
  npx tsx scripts/validate-env.ts [--mode=local|production] [--env-file=.env.local]
  npx tsx scripts/validate-env.ts --check-templates

Options:
  --check-templates         Validate that .env.example and .env.production.example include all required keys.
  --mode=production         Prefer loading .env.production.local/.env.production.
  --env-file=<path>         Load a specific env file.
  --require-service-role    Fail if SUPABASE_SERVICE_ROLE_KEY is missing.
  --print-docs              Print a short description of each env var.
`);
    return;
  }

  if (args['print-docs']) {
    printDocs();
  }

  if (args['check-templates']) {
    console.log(formatHeading('Validating env templates'));
    await validateTemplate('.env.example');
    await validateTemplate('.env.production.example');
    console.log('Env templates look good.');
    return;
  }

  const mode = args.mode === 'production' ? 'production' : 'local';
  const loaded = await loadEnvFromDisk({
    mode,
    envFile: typeof args['env-file'] === 'string' ? args['env-file'] : undefined,
  });

  if (loaded.length > 0) {
    console.log(formatHeading('Loaded env file'));
    console.log(`Loaded: ${loaded.join(', ')}`);
  } else {
    console.log(formatHeading('Loaded env file'));
    console.log('No env file found on disk. Using process.env only.');
  }

  console.log(formatHeading('Validating runtime environment'));

  validateRuntimeEnv({ requireServiceRoleKey: Boolean(args['require-service-role']) });

  console.log('Environment looks good.');
}

main().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
});
