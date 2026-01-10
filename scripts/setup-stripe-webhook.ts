import Stripe from 'stripe';

import { formatHeading, loadEnvFromDisk, parseCliArgs, requireEnv } from './_shared';

type Mode = 'test' | 'live';

function getApiVersion(): Stripe.LatestApiVersion {
  return '2025-12-15.clover';
}

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    console.log(`Usage:
  npx tsx scripts/setup-stripe-webhook.ts --webhook-url=https://<domain>/api/stripe/webhook [--mode=test|live] [--api-key=sk_...]

Notes:
  - If --api-key is omitted, STRIPE_SECRET_KEY from your env will be used.
  - This script creates a Stripe webhook endpoint and prints the signing secret.
`);
    return;
  }

  await loadEnvFromDisk({ mode: 'local' });

  const mode: Mode = args.mode === 'live' ? 'live' : 'test';
  const webhookUrl = typeof args['webhook-url'] === 'string' ? args['webhook-url'] : undefined;

  if (!webhookUrl) {
    throw new Error('--webhook-url is required (e.g. https://your-domain.com/api/stripe/webhook)');
  }

  const apiKey =
    (typeof args['api-key'] === 'string' ? args['api-key'] : undefined) ?? requireEnv('STRIPE_SECRET_KEY');

  if (mode === 'live' && apiKey.startsWith('sk_test_')) {
    throw new Error('You selected --mode=live but provided a test secret key (sk_test_...).');
  }

  if (mode === 'test' && apiKey.startsWith('sk_live_')) {
    throw new Error('You selected --mode=test but provided a live secret key (sk_live_...).');
  }

  console.log(formatHeading('Creating Stripe webhook endpoint'));
  console.log(`Mode: ${mode}`);
  console.log(`URL:  ${webhookUrl}`);

  const stripe = new Stripe(apiKey, { apiVersion: getApiVersion(), typescript: true });

  try {
    const endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
      ],
      description: 'RuleOne MVP webhook',
    });

    console.log(formatHeading('Webhook created'));
    console.log(`Endpoint ID: ${endpoint.id}`);

    // Stripe only returns the secret on creation.
    const secret = endpoint.secret;
    if (!secret) {
      console.log(
        '\nStripe did not return a signing secret. This usually means the endpoint already existed. ' +
          'Open the Stripe Dashboard → Developers → Webhooks and copy the signing secret manually.'
      );
      return;
    }

    console.log(formatHeading('Set this environment variable'));
    console.log(`STRIPE_WEBHOOK_SECRET=${secret}`);

    console.log(formatHeading('Manual fallback (if needed)'));
    console.log(`1) Stripe Dashboard → Developers → Webhooks → Add endpoint`);
    console.log(`2) Endpoint URL: ${webhookUrl}`);
    console.log(
      '3) Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted'
    );
    console.log('4) Copy the Signing secret into STRIPE_WEBHOOK_SECRET');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`\nFailed to create webhook endpoint via API: ${message}`);

    console.log(formatHeading('Manual setup instructions'));
    console.log('1) Stripe Dashboard → Developers → Webhooks');
    console.log('2) Click "Add endpoint"');
    console.log(`3) Endpoint URL: ${webhookUrl}`);
    console.log(
      '4) Select events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted'
    );
    console.log('5) Save, then reveal and copy the Signing secret');
    console.log('6) Set STRIPE_WEBHOOK_SECRET in Vercel/your environment');

    process.exitCode = 1;
  }
}

main().catch(error => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
});
