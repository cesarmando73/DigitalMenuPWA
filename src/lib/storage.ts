import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage bucket 'menu-images'.
 * Maps automatically by product code.
 */
export async function uploadProductImage(file: File, productCode: string) {
  try {
    const fileExt = file.name.split('.').pop();
    // Path: product_code.extension (e.g. FE-01.png)
    const fileName = `${productCode}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Upload to Storage
    const { data, error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, { 
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    // 3. Update Product Table
    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('product_code', productCode);

    if (updateError) throw updateError;

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk upload mapping script (Utility to be used from Admin)
 */
export async function bulkMapImages(files: FileList) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Expected format: code.ext (e.g., calamar_cp.jpg)
    const productCode = file.name.split('.')[0];
    results.push(await uploadProductImage(file, productCode));
  }
  return results;
}
