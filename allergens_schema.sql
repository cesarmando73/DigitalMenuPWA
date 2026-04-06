-- FASE 1: ESTRUCTURA DE BASE DE DATOS PARA ALÉRGENOS (N:M)

-- 1. Tabla base de alérgenos
CREATE TABLE IF NOT EXISTS alergenos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_es text NOT NULL UNIQUE,
    nombre_ca text,
    nombre_en text,
    nombre_de text,
    nombre_fr text,
    nombre_it text,
    nombre_pt text,
    icono_url text -- URL pública de la imagen en Supabase Storage
);

-- 2. Tabla intermedia Mucho a Muchos entre productos y alérgenos
CREATE TABLE IF NOT EXISTS producto_alergenos (
    producto_id uuid REFERENCES products(id) ON DELETE CASCADE,
    alergeno_id uuid REFERENCES alergenos(id) ON DELETE CASCADE,
    PRIMARY KEY (producto_id, alergeno_id)
);

-- 3. Habilitar RLS (Row Level Security) para estas tablas
ALTER TABLE alergenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_alergenos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso (Lectura pública para anon)
DROP POLICY IF EXISTS "Public access for alergenos" ON alergenos;
CREATE POLICY "Public access for alergenos" ON alergenos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public access for producto_alergenos" ON producto_alergenos;
CREATE POLICY "Public access for producto_alergenos" ON producto_alergenos FOR SELECT TO anon USING (true);

-- 5. Políticas de edición (Acceso para anon en admin local)
DROP POLICY IF EXISTS "Admin write access for producto_alergenos" ON producto_alergenos;
CREATE POLICY "Admin write access for producto_alergenos" ON producto_alergenos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Crear publicación para realtime si no existe
-- (Nota: products/categories ya estaban en publicación real-time según el schema original)
ALTER PUBLICATION supabase_realtime ADD TABLE alergenos;
ALTER PUBLICATION supabase_realtime ADD TABLE producto_alergenos;
