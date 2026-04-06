require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLERGENS_DIR = 'd:/AI/Menu Restaurante/Cas Padri/Alergenos';
const BUCKET_NAME = 'allergens';

const allergensMapping = [
    { file: 'Gluten.svg', name_es: 'Cereales con gluten', name_ca: 'Cereals amb gluten', name_en: 'Gluten', name_de: 'Glutenhaltiges Getreide', name_fr: 'Céréales avec gluten', name_it: 'Cereali con glutine', name_pt: 'Cereais com glúten' },
    { file: 'Crustaceo.svg', name_es: 'Crustáceos', name_ca: 'Crustacis', name_en: 'Crustaceans', name_de: 'Krebstiere', name_fr: 'Crustacés', name_it: 'Crostacei', name_pt: 'Crustáceos' },
    { file: 'Huevo.svg', name_es: 'Huevos', name_ca: 'Ous', name_en: 'Eggs', name_de: 'Eier', name_fr: 'Œufs', name_it: 'Uova', name_pt: 'Ovos' },
    { file: 'Pescado.svg', name_es: 'Pescado', name_ca: 'Peix', name_en: 'Fish', name_de: 'Fisch', name_fr: 'Poisson', name_it: 'Pesce', name_pt: 'Peixe' },
    { file: 'Cacahuete.svg', name_es: 'Cacahuetes', name_ca: 'Cacauets', name_en: 'Peanuts', name_de: 'Erdnüsse', name_fr: 'Arachides', name_it: 'Arachidi', name_pt: 'Amendoins' },
    { file: 'Soja.svg', name_es: 'Soja', name_ca: 'Soja', name_en: 'Soy', name_de: 'Soja', name_fr: 'Soja', name_it: 'Soia', name_pt: 'Soja' },
    { file: 'Lacteos.svg', name_es: 'Lácteos', name_ca: 'Lactis', name_en: 'Dairy', name_de: 'Milchprodukte', name_fr: 'Produits laitiers', name_it: 'Latticini', name_pt: 'Laticínios' },
    { file: 'FrutosCascara.svg', name_es: 'Frutos de cáscara', name_ca: 'Fruits de closca', name_en: 'Nuts', name_de: 'Schalenfrüchte', name_fr: 'Fruits à coque', name_it: 'Frutta a guscio', name_pt: 'Frutos de casca rija' },
    { file: 'Apio.svg', name_es: 'Apio', name_ca: 'Api', name_en: 'Celery', name_de: 'Sellerie', name_fr: 'Céleri', name_it: 'Sedano', name_pt: 'Aipo' },
    { file: 'Mostaza.svg', name_es: 'Mostaza', name_ca: 'Mostassa', name_en: 'Mustard', name_de: 'Senf', name_fr: 'Moutarde', name_it: 'Senape', name_pt: 'Mostarda' },
    { file: 'GranosSesamo.svg', name_es: 'Granos de sésamo', name_ca: 'Grans de sèsam', name_en: 'Sesame seeds', name_de: 'Sesamsamen', name_fr: 'Graines de sésame', name_it: 'Semi di sesamo', name_pt: 'Sementes de sésamo' },
    { file: 'DioxidoAzufreSulfitos.svg', name_es: 'Dióxido de azufre y sulfitos', name_ca: 'Diòxid de sofre i sulfits', name_en: 'Sulphur dioxide and sulphites', name_de: 'Schwefeldioxid und Sulfite', name_fr: 'Anhydride sulfureux et sulfites', name_it: 'Anidride solforosa e solfiti', name_pt: 'Dióxido de enxofre e sulfitos' },
    { file: 'Altramuces.svg', name_es: 'Altramuces', name_ca: 'Tramussos', name_en: 'Lupin', name_de: 'Lupinen', name_fr: 'Lupins', name_it: 'Lupini', name_pt: 'Tremoços' },
    { file: 'Moluscos.svg', name_es: 'Moluscos', name_ca: 'Mol·luscs', name_en: 'Molluscs', name_de: 'Weichtiere', name_fr: 'Mollusques', name_it: 'Molluschi', name_pt: 'Moluscos' }
];

async function setupAllergens() {
    console.log('--- SETTING UP ALLERGENS ---');

    // 1. Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets.find(b => b.name === BUCKET_NAME)) {
        console.log(`Creating bucket ${BUCKET_NAME}...`);
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        // NOTE: If RLS is on for storage.buckets, this might need dashboard intervention.
    }

    // 1.5 Ensure tables exist (running the schema SQL via code if possible, or assuming user ran it)
    // Here we'll just try to insert.

    for (const item of allergensMapping) {
        const filePath = path.join(ALLERGENS_DIR, item.file);
        if (!fs.existsSync(filePath)) {
            console.error(`  Skipping ${item.file}: File not found.`);
            continue;
        }

        console.log(`Processing ${item.name_es}...`);

        // 2. Upload to Storage
        const fileBuffer = fs.readFileSync(filePath);
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(item.file, fileBuffer, {
                contentType: 'image/svg+xml',
                upsert: true
            });

        if (uploadErr) {
            console.error(`  Upload failed for ${item.file}:`, uploadErr.message);
            // continue even if upload fails
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(item.file);

        // 4. Upsert into database
        const { error: dbErr } = await supabase
            .from('alergenos')
            .upsert({ 
                nombre_es: item.name_es,
                nombre_ca: item.name_ca,
                nombre_en: item.name_en,
                nombre_de: item.name_de,
                nombre_fr: item.name_fr,
                nombre_it: item.name_it,
                nombre_pt: item.name_pt,
                icono_url: publicUrl 
            }, { onConflict: 'nombre_es' });

        if (dbErr) {
            console.error(`  DB Error for ${item.name_es}:`, dbErr.message);
        } else {
            console.log(`  SUCCESS: Registered ${item.name_es}`);
        }
    }

    console.log('\n--- ALLERGENS SETUP FINISHED ---');
}

setupAllergens().catch(console.error);
