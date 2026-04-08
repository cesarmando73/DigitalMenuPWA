import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * Paths are organized by restaurant slug to ensure isolation.
 */
export async function uploadProductImage(file: File, slug: string, productCode: string, productId?: string) {
  try {
    const fileExt = file.name.split('.').pop();
    // Path: slug/product_code.extension (e.g. cas-padri/FE-01.png)
    const filePath = `${slug}/${productCode.replace(/\//g, '_')}.${fileExt}`;

    // 1. Upload to Storage bucket 'products'
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

    // 3. Update Product Table if ID is provided
    if (productId) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', productId);
      if (updateError) throw updateError;
    }

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk upload mapping script (Utility to be used from Admin)
 */
export async function bulkMapImages(files: FileList, slug: string) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Expected format: code.ext (e.g., calamar_cp.jpg)
    const productCode = file.name.split('.')[0];
    results.push(await uploadProductImage(file, slug, productCode));
  }
  return results;
}
