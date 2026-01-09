# RuleOne MVP

A Next.js application for blockchain wallet analysis with Supabase backend, Stripe payments, and Alchemy integration.

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Payments**: Stripe
- **Blockchain**: Alchemy SDK, Ethers.js
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A Stripe account
- An Alchemy API key

## Local Setup

### 1. Clone the repository and install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your actual credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Alchemy Configuration
ALCHEMY_API_KEY=your-alchemy-api-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

### 3. Set up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the migration file located at `supabase/migrations/00001_initial_schema.sql`
4. This will create the following tables:
   - `users`: User accounts with subscription status
   - `analyses`: Wallet analysis records
   - `analysis_results`: Analysis results with recommendations

### 4. Configure Supabase Authentication

1. Go to Authentication > Providers in your Supabase dashboard
2. Enable Email provider
3. Configure email templates as needed
4. Set up redirect URLs for your local environment (`http://localhost:3000`)

### 5. Set up Stripe

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Create product/price IDs for your subscription plans
4. Set up webhook endpoint for `checkout.session.completed` event:
   - URL: `http://localhost:3000/api/stripe/webhook` (use Stripe CLI for local testing)
   - Copy the webhook signing secret to your `.env.local`

### 6. Get Alchemy API Key

1. Sign up at https://www.alchemy.com
2. Create a new app
3. Copy your API key to `.env.local`

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication endpoints
│   │   │   ├── signup/     # User registration
│   │   │   ├── login/      # User login
│   │   │   └── logout/     # User logout
│   │   ├── wallet/         # Wallet analysis endpoints
│   │   │   └── analyze/    # Create and retrieve analyses
│   │   └── stripe/         # Stripe integration
│   │       ├── create-checkout/  # Create checkout session
│   │       └── webhook/          # Handle Stripe webhooks
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── lib/
│   ├── supabase.ts         # Supabase client configuration
│   └── types.ts            # TypeScript type definitions
├── supabase/
│   └── migrations/         # Database migration files
├── .env.example            # Environment variables template
└── README.md               # This file
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout current user

### Wallet Analysis

- `POST /api/wallet/analyze` - Create a new wallet analysis
- `GET /api/wallet/analyze?userId={userId}` - Get all analyses for a user

### Stripe

- `POST /api/stripe/create-checkout` - Create a Stripe checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhook events

## Database Schema

### Users Table
- `id` (UUID): Primary key
- `email` (TEXT): User email (unique)
- `created_at` (TIMESTAMP): Account creation timestamp
- `subscription_status` (TEXT): 'free', 'premium', or 'pro'

### Analyses Table
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `wallet_address` (TEXT): Blockchain wallet address
- `blockchain` (TEXT): Blockchain network
- `currency` (TEXT): Currency type
- `last_fetch` (TIMESTAMP): Last data fetch timestamp
- `created_at` (TIMESTAMP): Record creation timestamp

### Analysis Results Table
- `id` (UUID): Primary key
- `analysis_id` (UUID): Foreign key to analyses table
- `cost_saved_or_lost` (NUMERIC): Cost analysis result
- `discipline_score` (NUMERIC): Trading discipline score
- `recommendation` (TEXT): Analysis recommendation
- `preview_visible` (BOOLEAN): Whether preview is visible for free users

## Security Features

- Row Level Security (RLS) enabled on all tables
- User-specific data access policies
- Secure authentication with Supabase Auth
- Environment variable validation
- TypeScript strict mode for type safety

## Testing Stripe Webhooks Locally

Install the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the webhook signing secret provided by the CLI in your `.env.local`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. Implement frontend UI components
2. Add wallet connection functionality
3. Integrate Alchemy SDK for blockchain data
4. Build analysis logic
5. Create subscription management pages
6. Add error handling and loading states
7. Write tests

## License

MIT
