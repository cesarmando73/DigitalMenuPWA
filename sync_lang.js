require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const LANGUAGES_EXCEL = 'd:/AI/Menu Restaurante/Cas Padri/Productos idiomas.xlsx';

async function syncTranslations() {
    console.log('--- SYNCING OFFICIAL TRANSLATIONS (DEBUG) ---');
    const workbook = XLSX.readFile(LANGUAGES_EXCEL);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // List all rows with their key
    for (let i = 0; i < 5; i++) {
        console.log(`Row ${i}: Code=${rows[i]['Codigo']}, ES=${rows[i]['Español']}`);
    }

    const { data: currentProds } = await supabase.from('products').select('product_code');
    const dbCodes = currentProds.map(p => p.product_code);
    console.log('Sample DB Codes:', dbCodes.slice(0, 5));

    for (const row of rows) {
        const code = row['Codigo']; // Fixed key based on console check
        if (!code) continue;

        const { data, error } = await supabase
            .from('products')
            .update({
                name_es: row['Español'],
                name_ca: row['Català'],
                name_en: row['English'],
                name_de: row['Deutsch'],
                name_fr: row['Français'],
                name_it: row['Italiano'],
                name_pt: row['Português']
            })
            .eq('product_code', code.trim()) // trim to avoid spacing issues
            .select();

        if (error) {
            console.error(`Error updating ${code}:`, error.message);
        } else if (data && data.length > 0) {
            process.stdout.write('+');
        } else {
            // Not found in DB with that code
            process.stdout.write('?');
        }
    }

    console.log('\nSync finished successfully!');
}

syncTranslations().catch(console.error);
