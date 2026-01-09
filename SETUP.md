# Quick Setup Guide

This guide will help you set up the RuleOne MVP project locally.

## Prerequisites

- Node.js 18 or higher
- npm
- A Supabase account (free tier is fine)
- A Stripe account (test mode is fine)
- An Alchemy account (free tier is fine)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (usually takes 1-2 minutes)
3. Go to **Settings** → **API** in your Supabase dashboard
4. Copy your **Project URL** and **anon/public** key

#### Run the Database Migration

1. In your Supabase dashboard, go to the **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/00001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)
6. You should see a success message

This will create:
- `users` table
- `analyses` table
- `analysis_results` table
- Row Level Security policies
- Database indexes

#### Enable Email Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** is enabled
3. Optionally configure email templates under **Authentication** → **Email Templates**

### 3. Set Up Stripe

1. Go to [https://stripe.com](https://stripe.com) and create an account
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key** (use test mode keys)

#### Set Up Webhook (for local development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will output a webhook signing secret. Copy this for the next step.

### 4. Set Up Alchemy

1. Go to [https://www.alchemy.com](https://www.alchemy.com) and create an account
2. Click **Create App**
3. Choose:
   - Chain: Ethereum
   - Network: Mainnet (or testnet for testing)
4. Copy your **API Key**

### 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Alchemy Configuration
ALCHEMY_API_KEY=your-alchemy-api-key-here

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your-publishable-key-here
STRIPE_SECRET_KEY=sk_test_your-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Verify Everything Works

### Test the API Endpoints

You can use curl or Postman to test the API:

#### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Check Supabase Tables

Go to your Supabase dashboard → **Table Editor** and you should see:
- `users` table with your test user
- `analyses` table (empty for now)
- `analysis_results` table (empty for now)

## Troubleshooting

### Build fails with environment variable errors
- Make sure your `.env.local` file exists and has all required variables
- Restart your dev server after changing environment variables

### Supabase connection errors
- Verify your Supabase URL and anon key are correct
- Check that your Supabase project is running (not paused)
- Ensure you ran the migration SQL

### Stripe webhook errors
- For local development, you need the Stripe CLI running
- Make sure the webhook secret matches what the CLI outputs
- The webhook endpoint must be publicly accessible for production

### Can't find tables in Supabase
- Make sure you ran the SQL migration file
- Check the SQL Editor for any error messages
- Try refreshing the Table Editor page

## Next Steps

Now that your environment is set up, you can:

1. Build out the frontend UI
2. Implement wallet connection functionality  
3. Add blockchain data fetching with Alchemy SDK
4. Create the analysis logic
5. Build subscription management pages

See the main README.md for more details about the project structure and available API endpoints.
