require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const IMAGES_DIR = 'd:/AI/Menu Restaurante/Cas Padri/Imagenes';
const BUCKET_NAME = 'products'; // Ensure this matches your Supabase bucket

async function uploadImages() {
    console.log('--- UPLOADING IMAGES BY CODE ---');
    
    // 1. Ensure bucket exists or at least try to get it
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets.find(b => b.name === BUCKET_NAME)) {
        console.log(`Bucket ${BUCKET_NAME} not found. Please create it manually in Supabase dashboard and make it PUBLIC.`);
        return;
    }

    const files = fs.readdirSync(IMAGES_DIR);
    console.log(`Found ${files.length} images in folder.`);

    for (const fileName of files) {
        const filePath = path.join(IMAGES_DIR, fileName);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        // Clean code from filename: "FE-01.png" or "FE 01.png" -> "FE 01"
        const codeMatch = fileName.match(/([a-zA-Z]{2})[- ]?(\d{2})/);
        if (!codeMatch) {
            console.log(`Skipping ${fileName} (No valid code pattern)`);
            continue;
        }

        const standardCode = `${codeMatch[1].toUpperCase()} ${codeMatch[2]}`;
        const fileExt = path.extname(fileName).toLowerCase();
        const cloudPath = `${standardCode}${fileExt}`;

        console.log(`Processing ${fileName} for code [${standardCode}]...`);

        // 1. Upload to Storage
        const fileBuffer = fs.readFileSync(filePath);
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(cloudPath, fileBuffer, {
                contentType: 'image/png', // Adjust if needed
                upsert: true
            });

        if (uploadErr) {
            console.error(`  Upload failed for ${fileName}:`, uploadErr.message);
            continue;
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(cloudPath);

        // 3. Update Product in DB
        const { data: updated, error: dbErr } = await supabase
            .from('products')
            .update({ image_url: publicUrl })
            .eq('product_code', standardCode)
            .select();

        if (dbErr) {
            console.error(`  DB Update failed for ${standardCode}:`, dbErr.message);
        } else if (updated && updated.length > 0) {
            console.log(`  SUCCESS: Connected to ${updated[0].name_es}`);
        } else {
            console.log(`  WARNING: Product code [${standardCode}] not found in database.`);
        }
    }

    console.log('\n--- IMAGE UPLOAD FINISHED ---');
}

uploadImages().catch(console.error);
