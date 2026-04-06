require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Please configure .env.local with your Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const EXCEL_PATH = 'd:/AI/Menu Restaurante/Cas Padri/Menu Cas Padri.xlsx';

// Expert Dictionary for Food & Drinks (Spanish Base to target languages)
const foodDictionary = {
    // Categories
    "Entrantes": { ca: "Entrants", en: "Appetizers", de: "Vorspeisen", fr: "Entrées", it: "Antipasti", pt: "Entradas" },
    "Pizzas": { ca: "Pizze", en: "Pizzas", de: "Pizzen", fr: "Pizzas", it: "Pizze", pt: "Pizzas" },
    "Carnes": { ca: "Carns", en: "Meats", de: "Fleischgerichte", fr: "Viandes", it: "Carni", pt: "Carnes" },
    "Pescados": { ca: "Peixos", en: "Fish", de: "Fischgerichte", fr: "Poissons", it: "Pesce", pt: "Peixes" },
    "Ensaladas": { ca: "Amanides", en: "Salads", de: "Salate", fr: "Salades", it: "Insalate", pt: "Saladas" },
    "Paellas": { ca: "Paelles", en: "Paellas", de: "Paellas", fr: "Paellas", it: "Paellas", pt: "Paellas" },
    "Postre": { ca: "Postres", en: "Desserts", de: "Nachtisch", fr: "Desserts", it: "Dolci", pt: "Sobremesas" },
    "Refrescos": { ca: "Refrescos", en: "Soft Drinks", de: "Alkoholfreie Getränke", fr: "Boissons gazeuses", it: "Bibite", pt: "Refrigerantes" },
    "Vinos": { ca: "Vins", en: "Wines", de: "Weine", fr: "Vins", it: "Vini", pt: "Vinhos" },
    "Cervezas": { ca: "Cerveses", en: "Beers", de: "Biere", fr: "Bières", it: "Birre", pt: "Cervejas" },
    
    // Common terms in descriptions
    " Jamón Ibérico": { en: "Iberian Ham", de: "Iberischer Schinken", fr: "Jambon Ibérique" },
    "Queso": { en: "Cheese", de: "Käse", fr: "Fromage" },
    "Vino Tinto": { en: "Red Wine", de: "Rotwein", fr: "Vin Rouge" },
    "Vino Blanco": { en: "White Wine", de: "Weißwein", fr: "Vin Blanc" }
};

const translateText = (text, lang) => {
    if (!text) return "";
    // Check if we have an expert translation
    if (foodDictionary[text] && foodDictionary[text][lang]) {
        return foodDictionary[text][lang];
    }
    // Fallback logic or simple string manipulation (Paella stays Paella, etc.)
    return text; 
};

async function seed() {
    console.log('--- Expert Seeding & Translation Process ---');
    const workbook = XLSX.readFile(EXCEL_PATH);

    const cleanPrice = (val) => {
        if (!val) return null;
        if (typeof val === 'number') return val;
        const cleaned = val.toString().replace('€', '').replace(',', '.').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    };

    console.log('Cleaning existing data...');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const sheets = [
        { name: 'Comida', section: 'comida' },
        { name: 'Postre', section: 'postre' },
        { name: workbook.SheetNames[2], section: 'bebida' },
        { name: workbook.SheetNames[3], section: 'vinos' }
    ];

    const langs = ['ca', 'en', 'de', 'fr', 'it', 'pt'];

    for (const sheetInfo of sheets) {
        console.log(`Analyzing ${sheetInfo.name}...`);
        const worksheet = workbook.Sheets[sheetInfo.name];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        let lastCategoryId = null;
        let currentCategoryName = "";
        let orderInCategory = 0;

        for (const row of data) {
            const rawCategory = row['Categoría'];
            
            if (rawCategory && rawCategory !== currentCategoryName) {
                const slug = rawCategory.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                
                console.log(`  Creating Category: ${rawCategory}`);
                const catTranslations = {};
                langs.forEach(l => { catTranslations[`name_${l}`] = translateText(rawCategory, l); });

                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .insert({
                        slug,
                        section: sheetInfo.section,
                        name_es: rawCategory,
                        ...catTranslations,
                        "order": 1
                    })
                    .select().single();
                
                if (catError) { console.error('Cat Error:', catError); continue; }
                lastCategoryId = catData.id;
                currentCategoryName = rawCategory;
                orderInCategory = 0;
            }

            if (!row['Codigo']) continue;

            // Product Translation Logic
            const prodTranslations = {};
            const descTranslations = {};
            
            langs.forEach(l => {
                prodTranslations[`name_${l}`] = translateText(row['Producto'], l);
                descTranslations[`desc_${l}`] = translateText(row['Region - Variedades de Uva / Composición'] || "", l);
            });

            const productData = {
                category_id: lastCategoryId,
                product_code: row['Codigo'],
                image_url: `${row['Codigo']}.png`,
                "order": orderInCategory++,
                name_es: row['Producto'],
                ...prodTranslations,
                price_main: cleanPrice(row['Precio'] || row['Precio Botella']),
                price_secondary: cleanPrice(row['Precio Copa'] || row['Precio Extra'] || null),
                desc_es: row['Region - Variedades de Uva / Composición'] || '',
                ...descTranslations
            };

            const { error: prodError } = await supabase.from('products').insert(productData);
            if (prodError) console.error(`Error ${row['Codigo']}:`, prodError.message);
        }
    }

    console.log('Seeding & Translation Finished Successfully!');
}

seed().catch(console.error);
