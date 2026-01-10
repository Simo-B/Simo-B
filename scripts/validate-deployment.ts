import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

import { Alchemy, Network } from 'alchemy-sdk';

import {
  formatHeading,
  loadEnvFromDisk,
  optionalEnv,
  parseCliArgs,
  requireEnv,
} from './_shared';

type CheckResult = {
  name: string;
  ok: boolean;
  level: 'critical' | 'warning';
  message: string;
};

type HealthReport = {
  timestamp: string;
  baseUrl?: string;
  checks: CheckResult[];
  summary: {
    ok: boolean;
    criticalFailures: number;
    warnings: number;
  };
};

function addCheck(checks: CheckResult[], check: CheckResult) {
  checks.push(check);
}

async function checkSupabase(checks: CheckResult[]) {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = optionalEnv('SUPABASE_SERVICE_ROLE_KEY');

  const client = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

  const { error } = await client.from('users').select('id').limit(1);

  if (!error) {
    addCheck(checks, {
      name: 'Supabase connectivity',
      ok: true,
      level: 'critical',
      message: 'Connected and can query users table.',
    });
    return;
  }

  if (!serviceRoleKey) {
    addCheck(checks, {
      name: 'Supabase connectivity',
      ok: false,
      level: 'warning',
      message:
        `Could not query users table with anon key (often expected with RLS). ` +
        `Set SUPABASE_SERVICE_ROLE_KEY to enable admin connectivity checks. Error: ${error.message}`,
    });
    return;
  }

  addCheck(checks, {
    name: 'Supabase connectivity',
    ok: false,
    level: 'critical',
    message: `Could not query users table with service role key. Error: ${error.message}`,
  });
}

async function checkStripe(checks: CheckResult[]) {
  const secretKey = requireEnv('STRIPE_SECRET_KEY');

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });

  try {
    const account = await stripe.accounts.retrieve();

    addCheck(checks, {
      name: 'Stripe API key',
      ok: true,
      level: 'critical',
      message: `Stripe account reachable: ${account.id}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(checks, {
      name: 'Stripe API key',
      ok: false,
      level: 'critical',
      message,
    });
  }
}

async function checkAlchemy(checks: CheckResult[]) {
  const apiKey = requireEnv('ALCHEMY_API_KEY');

  const alchemy = new Alchemy({ apiKey, network: Network.ETH_MAINNET });

  try {
    const blockNumber = await alchemy.core.getBlockNumber();

    addCheck(checks, {
      name: 'Alchemy API key',
      ok: true,
      level: 'critical',
      message: `Fetched latest block number: ${blockNumber}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(checks, {
      name: 'Alchemy API key',
      ok: false,
      level: 'critical',
      message,
    });
  }
}

async function checkApiEndpoints(checks: CheckResult[], baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/wallet/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    addCheck(checks, {
      name: 'API /api/wallet/analyze reachable',
      ok: res.status >= 200 && res.status < 500,
      level: 'critical',
      message: `HTTP ${res.status} (expected 400 for empty body)`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(checks, {
      name: 'API /api/wallet/analyze reachable',
      ok: false,
      level: 'critical',
      message,
    });
  }

  try {
    const res = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    addCheck(checks, {
      name: 'API /api/stripe/webhook reachable',
      ok: res.status === 400 || res.status === 500,
      level: 'warning',
      message: `HTTP ${res.status} (expected 400 due to missing stripe-signature)`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    addCheck(checks, {
      name: 'API /api/stripe/webhook reachable',
      ok: false,
      level: 'warning',
      message,
    });
  }
}

function summarize(checks: CheckResult[]): HealthReport['summary'] {
  const criticalFailures = checks.filter(c => c.level === 'critical' && !c.ok).length;
  const warnings = checks.filter(c => c.level === 'warning' && !c.ok).length;
  return {
    ok: criticalFailures === 0,
    criticalFailures,
    warnings,
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    console.log(`Usage:
  npx tsx scripts/validate-deployment.ts --base-url=https://<your-domain>

Options:
  --base-url=<url>          Deployed site URL (e.g. https://ruleone.vercel.app)
  --env-file=<path>         Load env vars from a file (default: tries .env.local/.env)
  --output=<path>           Write JSON report to this path (default: deployment-health-report.json)

This script:
  - Validates Supabase connectivity
  - Validates Stripe key
  - Validates Alchemy key
  - Smoke-tests API endpoints
`);
    return;
  }

  const envFile = typeof args['env-file'] === 'string' ? args['env-file'] : undefined;
  await loadEnvFromDisk({ envFile, mode: 'production' });

  const baseUrl = typeof args['base-url'] === 'string' ? args['base-url'] : undefined;

  const checks: CheckResult[] = [];

  console.log(formatHeading('Validating API keys / connectivity'));
  await checkSupabase(checks);
  await checkStripe(checks);
  await checkAlchemy(checks);

  if (baseUrl) {
    console.log(formatHeading('Smoke testing deployed endpoints'));
    await checkApiEndpoints(checks, baseUrl.replace(/\/$/, ''));
  } else {
    addCheck(checks, {
      name: 'Deployed endpoint smoke tests',
      ok: false,
      level: 'warning',
      message: 'Skipped (no --base-url provided).',
    });
  }

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    baseUrl,
    checks,
    summary: summarize(checks),
  };

  const outputPath =
    (typeof args.output === 'string' ? args.output : undefined) ?? 'deployment-health-report.json';

  await fsWriteJson(outputPath, report);

  console.log(formatHeading('Deployment health report'));
  console.log(`Wrote: ${outputPath}`);
  console.log(`OK: ${report.summary.ok}`);
  console.log(`Critical failures: ${report.summary.criticalFailures}`);
  console.log(`Warnings: ${report.summary.warnings}`);

  if (!report.summary.ok) {
    process.exitCode = 1;
  }
}

async function fsWriteJson(filePath: string, data: unknown): Promise<void> {
  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

main().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
});
