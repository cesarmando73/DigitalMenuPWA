-- Create extension for UUID if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: categories
DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  section text NOT NULL CHECK (section IN ('comida', 'bebida', 'postre', 'vinos')),
  is_visible boolean DEFAULT true,
  "order" int DEFAULT 0,
  -- Translations (Name)
  name_es text,
  name_ca text,
  name_en text,
  name_de text,
  name_fr text,
  name_it text,
  name_pt text
);

-- 2. Table: products
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  product_code text UNIQUE NOT NULL,
  image_url text, -- Link to Supabase Storage
  is_visible boolean DEFAULT true,
  "order" int DEFAULT 0,
  price_main numeric(10, 2), -- Botella o plato principal
  price_secondary numeric(10, 2), -- Copa o extra
  has_allergens jsonb DEFAULT '{}'::jsonb,
  -- Translations (Name)
  name_es text,
  name_ca text,
  name_en text,
  name_de text,
  name_fr text,
  name_it text,
  name_pt text,
  -- Translations (Description)
  desc_es text,
  desc_ca text,
  desc_en text,
  desc_de text,
  desc_fr text,
  desc_it text,
  desc_pt text
);

-- Real-time settings for admin panel
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
