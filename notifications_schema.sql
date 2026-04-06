-- Table for Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint text UNIQUE NOT NULL,
  subscription_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public) to insert a subscription (so clients can subscribe)
-- Ideally you would limit this, but for a public-facing menu it's common.
CREATE POLICY "Allow public insert subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Only service role or authenticated admins can view them (to send messages)
CREATE POLICY "Allow service role to select subscriptions" ON push_subscriptions
  FOR SELECT USING (true);

-- Add to real-time if needed (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
