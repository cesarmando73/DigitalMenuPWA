require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const CATEGORIES_EXCEL = 'd:/AI/Menu Restaurante/Cas Padri/categories_rows.xlsx';

async function syncCategories() {
    console.log('--- SYNCING OFFICIAL CATEGORIES TRANSLATIONS ---');
    const workbook = XLSX.readFile(CATEGORIES_EXCEL);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`Processing ${rows.length} categories...`);

    for (const row of rows) {
        const catId = row['id']; // We'll try to match by ID or Name
        const nameEs = row['name_es'];
        if (!nameEs) continue;

        const updateData = {
            name_es: nameEs,
            name_ca: row['Català'],
            name_en: row['English'],
            name_de: row['Deutsch'],
            name_fr: row['Français'],
            name_it: row['Italiano'],
            name_pt: row['Português'],
            section: row['section']
        };

        // If 'id' matches a UUID in Supabase, update by ID. 
        // Otherwise, update by the original Spanish name to keep it safe.
        let query = supabase.from('categories').update(updateData);
        
        if (catId && catId.length > 20) { // Simple check for UUID string
            query = query.eq('id', catId);
        } else {
            // Match by case-insensitive name or slug if needed
            const slug = nameEs.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            query = query.eq('slug', slug);
        }

        const { data, error } = await query.select();

        if (error) {
            console.error(`Error updating category ${nameEs}:`, error.message);
        } else if (data && data.length > 0) {
            process.stdout.write('+');
        } else {
            // Not found, let's try to insert if it's a new official category
            console.log(`\nCategory not found, creating: ${nameEs}`);
            const slug = nameEs.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            await supabase.from('categories').insert({ ...updateData, slug });
        }
    }

    console.log('\nCategories Sync Finished Successfully!');
}

syncCategories().catch(console.error);
