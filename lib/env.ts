export function validateEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables.'
    );
  }

  if (!stripeSecretKey || !stripePublicKey || !stripeWebhookSecret) {
    throw new Error(
      'Missing required Stripe environment variables.'
    );
  }
}
