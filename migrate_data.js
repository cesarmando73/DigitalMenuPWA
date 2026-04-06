const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ORIGINAL SUPABASE (Source)
const SOURCE_URL = 'https://ohjcwtbktsmiryvdazfn.supabase.co';
const SOURCE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oamN3dGJrdHNtaXJ5dmRhemZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg1NTM5OCwiZXhwIjoyMDg5NDMxMzk4fQ.PXUzBMhAmi9XLiyHWCw1aNkMKDtYO3vqLrkW_2BGN9M';

// NEW SUPABASE (Destination)
const DEST_URL = 'https://frpqpirhxxwkylrighuc.supabase.co';
const DEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycHFwaXJoeHh3a3lscmlnaHVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ1OTk1MiwiZXhwIjoyMDkxMDM1OTUyfQ.2OkFhx25o6p-HrCy6bBfxhHZ8oclXyNwK3zN7tDeSig';

const source = createClient(SOURCE_URL, SOURCE_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

async function migrate() {
    console.log('🚀 INICIANDO MIGRACIÓN TOTAL: Cas Padri -> DigitalMenuPWA\n');

    const tables = ['categories', 'products', 'alergenos', 'producto_alergenos'];
    const buckets = ['products', 'allergens'];

    // 1. MIGRAR BUCKETS (Imágenes)
    console.log('--- 📸 Migrando Almacenamiento (Storage) ---');
    for (const bucketName of buckets) {
        console.log(`Procesando bucket: ${bucketName}...`);
        
        // Crear bucket si no existe
        await dest.storage.createBucket(bucketName, { public: true });

        const { data: files, error: listError } = await source.storage.from(bucketName).list('', { limit: 1000 });
        if (listError) {
            console.error(`Error listando archivos en ${bucketName}:`, listError.message);
            continue;
        }

        for (const file of files) {
            if (file.name === '.emptyFolderPlaceholder') continue;
            
            console.log(`  Copiando: ${file.name}`);
            const { data: blob, error: downloadError } = await source.storage.from(bucketName).download(file.name);
            
            if (downloadError) {
                console.error(`    Error descargando ${file.name}:`, downloadError.message);
                continue;
            }

            const { error: uploadError } = await dest.storage.from(bucketName).upload(file.name, blob, { upsert: true });
            if (uploadError) {
                console.error(`    Error subiendo ${file.name}:`, uploadError.message);
            }
        }
    }

    // 2. MIGRAR TABLAS (Datos)
    console.log('\n--- 📊 Migrando Datos de Tablas ---');
    
    // El orden importa por las foreign keys
    const migrationOrder = ['categories', 'products', 'alergenos', 'producto_alergenos'];

    for (const table of migrationOrder) {
        console.log(`Procesando tabla: ${table}...`);
        
        const { data: rows, error: fetchError } = await source.from(table).select('*');
        if (fetchError) {
            console.error(`Error obteniendo datos de ${table}:`, fetchError.message);
            continue;
        }

        if (rows.length === 0) {
            console.log(`  Tabla ${table} vacía.`);
            continue;
        }

        // Corregir URLs de imágenes en los datos antes de insertar
        const cleanedRows = rows.map(row => {
            const newRow = { ...row };
            for (const key in newRow) {
                if (typeof newRow[key] === 'string' && newRow[key].includes(SOURCE_URL)) {
                    newRow[key] = newRow[key].replace(SOURCE_URL, DEST_URL);
                    // También corregir el project ref en el path si es necesario (generalmente está en el URL)
                    newRow[key] = newRow[key].replace('ohjcwtbktsmiryvdazfn', 'frpqpirhxxwkylrighuc');
                }
            }
            return newRow;
        });

        const { error: insertError } = await dest.from(table).upsert(cleanedRows);
        if (insertError) {
            console.error(`  Error insertando en ${table}:`, insertError.message);
        } else {
            console.log(`  ✅ ${rows.length} filas migradas con éxito.`);
        }
    }

    console.log('\n✨ MIGRACIÓN COMPLETADA CON ÉXITO ✨');
}

migrate().catch(console.error);
