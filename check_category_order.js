const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_es, order')
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error.message);
  } else {
    console.log('Categories sorted by order (JSON):');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkOrder();
