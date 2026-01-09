-- Update users table with Stripe columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Update subscription_status to allow active, inactive, null
-- First, remove the existing check constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_subscription_status_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_subscription_status_check;
    END IF;
END $$;

ALTER TABLE users 
ALTER COLUMN subscription_status DROP DEFAULT,
ALTER COLUMN subscription_status TYPE TEXT,
ALTER COLUMN subscription_status SET DEFAULT NULL;

-- Add new check constraint
ALTER TABLE users 
ADD CONSTRAINT users_subscription_status_check 
CHECK (subscription_status IN ('active', 'inactive') OR subscription_status IS NULL);

-- Ensure preview_visible defaults to false in analysis_results
ALTER TABLE analysis_results 
ALTER COLUMN preview_visible SET DEFAULT false;
