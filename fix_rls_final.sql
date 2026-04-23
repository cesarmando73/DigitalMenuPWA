-- SQL to fix RLS and Policies for DigitalMenuPWA
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE alergenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_alergenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any conflicting old policies
DROP POLICY IF EXISTS "Public can view any restaurant" ON restaurants;
DROP POLICY IF EXISTS "Public can view any restaurant" ON restaurantes;
DROP POLICY IF EXISTS "Public can view categories of any restaurant" ON categories;
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Public can view products of any restaurant" ON products;
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Public can view alergenos" ON alergenos;
DROP POLICY IF EXISTS "Public access for alergenos" ON alergenos;
DROP POLICY IF EXISTS "Public can view product allergens" ON producto_alergenos;
DROP POLICY IF EXISTS "Public access for producto_alergenos" ON producto_alergenos;

DROP POLICY IF EXISTS "Admins can update their own restaurant data" ON restaurants;
DROP POLICY IF EXISTS "Admins can manage their categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage their products" ON products;
DROP POLICY IF EXISTS "Admins can manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage their product allergens" ON producto_alergenos;
DROP POLICY IF EXISTS "Admin write access for producto_alergenos" ON producto_alergenos;

-- 3. Public Policies (Allow anyone to read menu data)
CREATE POLICY "Public can view any restaurant" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Public can view alergenos" ON alergenos FOR SELECT USING (true);
CREATE POLICY "Public can view product allergens" ON producto_alergenos FOR SELECT USING (true);

-- 4. Helper Function (Ensure it uses the correct column name 'restaurant_id')
CREATE OR REPLACE FUNCTION get_user_restaurant_id() 
RETURNS uuid AS $$
  SELECT restaurant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 5. Admin Policies (Allow authenticated admins to manage their own data)
CREATE POLICY "Admins can update their own restaurant data" 
  ON restaurants FOR UPDATE 
  TO authenticated
  USING (id = get_user_restaurant_id());

CREATE POLICY "Admins can manage their categories" 
  ON categories FOR ALL 
  TO authenticated
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Admins can manage their products" 
  ON products FOR ALL 
  TO authenticated
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Admins can manage their product allergens" 
  ON producto_alergenos FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = producto_alergenos.producto_id 
      AND products.restaurant_id = get_user_restaurant_id()
    )
  );

CREATE POLICY "Admins can manage their own profile" 
  ON profiles FOR ALL 
  TO authenticated
  USING (id = auth.uid());
