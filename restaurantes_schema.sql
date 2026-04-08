-- Multi-tenant schema extensions for DigitalMenuPWA
-- Ensure uuid-ossp is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: restaurantes
CREATE TABLE IF NOT EXISTS restaurantes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- Used in URL: myapp.com/slug
  logo_url text,
  header_image_url text,
  
  -- Contact info
  address text,
  google_maps_url text,
  phone text,
  email text,
  schedule jsonb DEFAULT '{}'::jsonb, -- Store business hours per day
  
  -- Settings & Customization
  primary_color text DEFAULT '#D4AF37', -- Gold default
  secondary_color text DEFAULT '#000000',
  font_family text DEFAULT 'Inter',
  
  -- SEO & Branding
  meta_description text,
  instagram_username text,
  facebook_url text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Profiles (Auth Link)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  restaurante_id uuid REFERENCES restaurantes(id),
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  full_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Add restaurante_id to existing tables
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='restaurante_id') THEN
        ALTER TABLE categories ADD COLUMN restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='restaurante_id') THEN
        ALTER TABLE products ADD COLUMN restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_subscriptions' AND column_name='restaurante_id') THEN
        ALTER TABLE push_subscriptions ADD COLUMN restaurante_id uuid REFERENCES restaurantes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE restaurantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public can view any restaurant's public info
CREATE POLICY "Public can view any restaurant" ON restaurantes FOR SELECT USING (true);
CREATE POLICY "Public can view categories of any restaurant" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view products of any restaurant" ON products FOR SELECT USING (true);

-- Helper function to get current user's restaurant_id
CREATE OR REPLACE FUNCTION get_user_restaurant_id() 
RETURNS uuid AS $$
  SELECT restaurante_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Admin-specific policies
CREATE POLICY "Admins can update their own restaurant data" 
  ON restaurantes FOR UPDATE 
  USING (id = get_user_restaurant_id());

CREATE POLICY "Admins can manage their categories" 
  ON categories FOR ALL 
  USING (restaurante_id = get_user_restaurant_id());

CREATE POLICY "Admins can manage their products" 
  ON products FOR ALL 
  USING (restaurante_id = get_user_restaurant_id());

CREATE POLICY "Admins can manage their own profile" 
  ON profiles FOR ALL 
  USING (id = auth.uid());

-- SuperAdmin can do everything (optional)
CREATE POLICY "SuperAdmins can manage everything"
  ON restaurantes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Push Subscriptions policies
CREATE POLICY "Public can insert subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view their restaurant subscriptions" ON push_subscriptions FOR SELECT USING (restaurante_id = get_user_restaurant_id());
