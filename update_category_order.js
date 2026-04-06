const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCategoryOrder() {
  const filePath = 'd:/AI/Menu Restaurante/Cas Padri/categories_rows.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Assuming first sheet
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Successfully read ${data.length} categories from Excel.`);

  for (const row of data) {
    const categoryId = row.id;
    const newOrder = row.Orden;

    if (!categoryId || newOrder === undefined) {
      console.warn(`Skipping row due to missing ID or Order:`, row);
      continue;
    }

    const { error } = await supabase
      .from('categories')
      .update({ order: newOrder })
      .eq('id', categoryId);

    if (error) {
      console.error(`Error updating category ${categoryId}:`, error.message);
    } else {
      console.log(`Updated category ${categoryId} to order ${newOrder}`);
    }
  }

  console.log('Update complete.');
}

updateCategoryOrder();
