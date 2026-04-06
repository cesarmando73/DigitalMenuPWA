require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function standardizeCodes() {
    console.log('--- STANDARDIZING PRODUCT CODES (XX 00) ---');
    
    // 1. Fetch all existing products
    const { data: products, error } = await supabase
        .from('products')
        .select('id, product_code');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Processing ${products.length} products...`);

    for (const prod of products) {
        const rawCode = prod.product_code || "";
        
        // Match XX-00 or XX00 or XX 00
        // We want to force it to "XX 00" (5 chars total)
        let letters = rawCode.match(/[a-zA-Z]+/)?.[0] || "XX";
        let numbers = rawCode.match(/\d+/)?.[0] || "00";
        
        // Ensure numbers are 2 digits (padding-left with 0 if necessary)
        if (numbers.length === 1) numbers = "0" + numbers;
        if (numbers.length > 2) numbers = numbers.substring(0, 2);
        
        // Ensure letters are uppercase and exactly 2
        letters = letters.toUpperCase().substring(0, 2);

        const standardCode = `${letters} ${numbers}`;

        if (standardCode !== rawCode) {
            console.log(`Updating ${rawCode} -> ${standardCode}`);
            const { error: upErr } = await supabase
                .from('products')
                .update({ product_code: standardCode })
                .eq('id', prod.id);

            if (upErr) console.error(`Error ${rawCode}:`, upErr.message);
        }
    }

    console.log('\nStandardization Finished Successfully!');
}

standardizeCodes().catch(console.error);
