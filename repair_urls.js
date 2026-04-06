require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'products';

async function fixProductUrls() {
    console.log('--- REPAIRING PRODUCT URLs ---');
    
    // 1. Get all products with image_url
    const { data: products, error } = await supabase
        .from('products')
        .select('id, product_code, image_url')
        .not('image_url', 'is', null);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Found ${products.length} products with images to check.`);

    for (const prod of products) {
        // If it starts with http, it's already a full URL or at least looks like it
        if (prod.image_url.startsWith('http')) {
            console.log(`Skipping ${prod.product_code} (already full URL)`);
            continue;
        }

        // It's probably just a filename (e.g., "FP 21.png")
        const fileName = prod.image_url;
        
        // Construct public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        console.log(`Updating ${prod.product_code}: ${fileName} -> ${publicUrl}`);

        const { error: updateErr } = await supabase
            .from('products')
            .update({ image_url: publicUrl })
            .eq('id', prod.id);

        if (updateErr) {
            console.error(`  Upload failed for ${prod.product_code}:`, updateErr.message);
        }
    }

    console.log('--- URL REPAIR FINISHED ---');
}

fixProductUrls().catch(console.error);
