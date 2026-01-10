# Deployment Guide (RuleOne MVP)

This document is written for someone with minimal DevOps experience. Follow it in order.

## What you’ll deploy

- **Next.js app** on **Vercel**
- **Postgres + Auth** on **Supabase**
- **Payments + Webhooks** on **Stripe**
- **Blockchain data** via **Alchemy**

---

## 0) Create accounts

1. **Supabase**: https://supabase.com
2. **Stripe**: https://stripe.com
3. **Alchemy**: https://www.alchemy.com
4. **Vercel**: https://vercel.com

---

## 1) Supabase: create project + run migrations

### 1.1 Create a Supabase project

- Supabase Dashboard → **New project**
- Choose a name + password
- Wait until provisioning completes

### 1.2 Get your Supabase keys

Supabase Dashboard → **Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 1.3 Run database migrations

You have two options:

#### Option A (recommended): run automated script

1) Put values in `.env.local` (see templates below)

2) Run:

```bash
npm run setup:supabase
```

If `SUPABASE_DB_URL` is set, the script will apply SQL migrations from `supabase/migrations/`.

#### Option B: manual migration (always works)

1) Supabase Dashboard → **SQL Editor** → **New query**
2) Copy/paste the contents of:

- `supabase/migrations/00001_initial_schema.sql`

3) Click **Run**

---

## 2) Alchemy: create app + API key

1) Alchemy Dashboard → **Apps** → **Create App**
2) Choose a chain/network (Ethereum Mainnet is fine)
3) Copy the API key → set `ALCHEMY_API_KEY`

---

## 3) Stripe: create keys + configure webhook

### 3.1 Get Stripe API keys

Stripe Dashboard:

- **Test mode** (for staging): Developers → **API keys**
  - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` (pk_test_...)
  - Secret key → `STRIPE_SECRET_KEY` (sk_test_...)

- **Live mode** (for production): toggle **LIVE** in Stripe, then copy:
  - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` (pk_live_...)
  - Secret key → `STRIPE_SECRET_KEY` (sk_live_...)

### 3.2 Create the webhook endpoint (production)

Your webhook endpoint will be:

```
https://<your-domain>/api/stripe/webhook
```

#### Automated setup (recommended)

```bash
npm run setup:stripe-webhook -- --mode=live --webhook-url=https://<your-domain>/api/stripe/webhook
```

The script prints a value like:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Copy that into your **Vercel Environment Variables**.

#### Manual setup (fallback)

Stripe Dashboard → **Developers → Webhooks** → **Add endpoint**

- Endpoint URL: `https://<your-domain>/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Save, then reveal and copy the **Signing secret** → set `STRIPE_WEBHOOK_SECRET`.

---

## 4) Configure environment variables

### 4.1 Local setup

```bash
cp .env.example .env.local
```

Fill in the values.

### 4.2 Production template

For production values, use:

- `.env.production.example` (copy to `.env.production.local` if you want to test production builds locally)

### 4.3 Validate your environment variables

```bash
npm run validate:env
```

This checks required variables exist and prints helpful messages.

---

## 5) Deploy to Vercel

### 5.1 Create a Vercel project

1) Push this repo to GitHub
2) In Vercel, click **Add New → Project**
3) Import your repository

### 5.2 Set environment variables in Vercel

Vercel Dashboard → **Project → Settings → Environment Variables**

Set the following (copy names exactly):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALCHEMY_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Make sure you set them for:

- **Production** (for your main domain)
- **Preview** (so PR deployments work)

### 5.3 Deploy

- Merging to your main branch triggers a Vercel production deployment (if Git integration is enabled).
- Preview deployments happen automatically for pull requests.

---

## 6) Post-deployment validation checklist

### 6.1 Run automated deployment validation

```bash
npm run validate:deployment -- --base-url=https://<your-domain>
```

This produces `deployment-health-report.json`.

### 6.2 Manual smoke tests

1) Open the site
2) Confirm the home page loads
3) Test sign up / login (Supabase Auth)
4) Trigger a wallet analysis (requires Alchemy)
5) Create a Stripe checkout session (requires a valid priceId from your Stripe Products)
6) Confirm webhook delivery in Stripe Dashboard → Developers → Webhooks

---

## Rollback procedures

### Roll back a Vercel deployment

1) Vercel Dashboard → Project → **Deployments**
2) Find the last known-good deployment
3) Click **⋯ → Promote to Production**

### Disable Stripe webhook processing (emergency)

- Temporarily unset `STRIPE_WEBHOOK_SECRET` in Vercel (Production)
- Or disable the webhook endpoint in Stripe Dashboard

### Supabase rollback

Supabase does not automatically roll back schema changes.

- If you applied a bad migration, create a new SQL migration that reverses it.
- Use Supabase SQL Editor to apply the fix.

---

## GitHub Actions (optional)

If you configure GitHub Actions secrets, this repo includes a workflow at `.github/workflows/deploy.yml` that:

- Runs lint + build on every push/PR
- (Optional) Deploys to Vercel on merges to `main`

You must add repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

You can find these in Vercel:

- Token: Vercel → Account Settings → Tokens
- Org/Project IDs: `vercel link` locally or Vercel project settings
