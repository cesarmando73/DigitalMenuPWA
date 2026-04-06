require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url') {
    console.error('Please configure .env.local with your Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EXCEL_PATH = 'd:/AI/Menu Restaurante/Cas Padri/Menu Cas Padri.xlsx';

async function seed() {
    console.log('Starting seeding process...');
    const workbook = XLSX.readFile(EXCEL_PATH);

    // Helper to clean price: "5,00€" -> 5.00
    const cleanPrice = (val) => {
        if (!val || typeof val !== 'string') return null;
        const cleaned = val.replace('€', '').replace(',', '.').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    };

    // 1. Clear existing data
    console.log('Clearing old data...');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Process sheets
    const sheets = [
        { name: 'Comida', section: 'comida' },
        { name: 'Postre', section: 'postre' },
        { name: workbook.SheetNames[2], section: 'bebida' }, // "Bebidas y Cafes"
        { name: workbook.SheetNames[3], section: 'vinos' } // "Vinos y Cavas"
    ];

    for (const sheetInfo of sheets) {
        console.log(`Processing sheet: ${sheetInfo.name}...`);
        const worksheet = workbook.Sheets[sheetInfo.name];
        const data = XLSX.utils.sheet_to_json(worksheet);

        let currentCategorySlug = null;
        let lastCategoryId = null;
        let orderInCategory = 0;

        for (const row of data) {
            const rawCategory = row['Categoría'];
            
            // If category changes or is new
            if (rawCategory) {
                const slug = rawCategory.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]/g, '');
                
                if (slug !== currentCategorySlug) {
                    console.log(`  Adding category: ${rawCategory}`);
                    const { data: catData, error: catError } = await supabase
                        .from('categories')
                        .insert({
                            slug,
                            section: sheetInfo.section,
                            name_es: rawCategory,
                            // Placeholders for other languages (USER will need to provide translations or we can machine translate later)
                            name_ca: rawCategory,
                            name_en: rawCategory,
                            name_de: rawCategory,
                            name_fr: rawCategory,
                            name_it: rawCategory,
                            name_pt: rawCategory,
                            "order": 1 // Simplified: alphabetical or sheet order
                        })
                        .select()
                        .single();
                    
                    if (catError) {
                        console.error('Error inserting category:', catError);
                        continue;
                    }
                    
                    lastCategoryId = catData.id;
                    currentCategorySlug = slug;
                    orderInCategory = 0;
                }
            }

            if (!row['Codigo']) continue;

            // Mapping image URL based on code (User said: each image file carries as name the code of each product)
            // e.g. calamar_cp.jpg -> we'll use a placeholder URL for now that the user can map to their Supabase Storage bucket
            const imagePath = `${row['Codigo']}.png`; // Most local images found were .png

            const productData = {
                category_id: lastCategoryId,
                product_code: row['Codigo'],
                image_url: imagePath,
                "order": orderInCategory++,
                name_es: row['Producto'],
                name_ca: row['Producto'],
                name_en: row['Producto'],
                name_de: row['Producto'],
                name_fr: row['Producto'],
                name_it: row['Producto'],
                name_pt: row['Producto'],
                // Vinos handle price differently
                price_main: cleanPrice(row['Precio'] || row['Precio Botella']),
                price_secondary: cleanPrice(row['Precio Copa'] || row['Precio Extra'] || null),
                desc_es: row['Region - Variedades de Uva / Composición'] || ''
            };

            const { error: prodError } = await supabase
                .from('products')
                .insert(productData);

            if (prodError) {
                console.error(`Error inserting product ${row['Codigo']}:`, prodError);
            }
        }
    }

    console.log('Seeding completed!');
}

seed().catch(console.error);
