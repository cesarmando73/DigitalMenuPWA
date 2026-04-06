require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const translations = [
  { es: 'Cereales con gluten', ca: 'Cereals amb gluten', en: 'Gluten', de: 'Glutenhaltiges Getreide', fr: 'Céréales avec gluten', it: 'Cereali con glutine', pt: 'Cereais com glúten' },
  { es: 'Crustáceos', ca: 'Crustacis', en: 'Crustaceans', de: 'Krebstiere', fr: 'Crustacés', it: 'Crostacei', pt: 'Crustáceos' },
  { es: 'Huevos', ca: 'Ous', en: 'Eggs', de: 'Eier', fr: 'Œufs', it: 'Uova', pt: 'Ovos' },
  { es: 'Pescado', ca: 'Peix', en: 'Fish', de: 'Fisch', fr: 'Poisson', it: 'Pesce', pt: 'Peixe' },
  { es: 'Cacahuetes', ca: 'Cacauets', en: 'Peanuts', de: 'Erdnüsse', fr: 'Arachides', it: 'Arachidi', pt: 'Amendoins' },
  { es: 'Soja', ca: 'Soja', en: 'Soy', de: 'Soja', fr: 'Soja', it: 'Soia', pt: 'Soja' },
  { es: 'Lácteos', ca: 'Lactis', en: 'Dairy', de: 'Milchprodukte', fr: 'Produits laitiers', it: 'Latticini', pt: 'Laticínios' },
  { es: 'Frutos de cáscara', ca: 'Fruits de closca', en: 'Nuts', de: 'Schalenfrüchte', fr: 'Fruits à coque', it: 'Frutta a guscio', pt: 'Frutos de casca' },
  { es: 'Apio', ca: 'Api', en: 'Celery', de: 'Sellerie', fr: 'Céleri', it: 'Sedano', pt: 'Aipo' },
  { es: 'Mostaza', ca: 'Mostassa', en: 'Mustard', de: 'Senf', fr: 'Moutarde', it: 'Senape', pt: 'Mostarda' },
  { es: 'Granos de sésamo', ca: 'Grans de sèsam', en: 'Sesame seeds', de: 'Sesamsamen', fr: 'Graines de sésame', it: 'Semi di sesamo', pt: 'Sementes de sésamo' },
  { es: 'Dióxido de azufre y sulfitos', ca: 'Diòxid de sofre i sulfits', en: 'Sulphur dioxide and sulphites', de: 'Schwefeldioxid und Sulfite', fr: 'Anhydride sulfureux et sulfites', it: 'Anidride solforosa e solfiti', pt: 'Dióxido de enxofre e sulfitos' },
  { es: 'Altramuces', ca: 'Tramussos', en: 'Lupin', de: 'Lupinen', fr: 'Lupins', it: 'Lupini', pt: 'Tremoços' },
  { es: 'Moluscos', ca: 'Mol·luscs', en: 'Molluscs', de: 'Weichtiere', fr: 'Mollusques', it: 'Molluschi', pt: 'Moluscos' }
];

async function updateAllergens() {
  console.log('Updating allergens with multi-language support...');

  for (const item of translations) {
    const { data, error } = await supabase
      .from('alergenos')
      .update({
        nombre_ca: item.ca,
        nombre_en: item.en,
        nombre_de: item.de,
        nombre_fr: item.fr,
        nombre_it: item.it,
        nombre_pt: item.pt
      })
      .eq('nombre_es', item.es);

    if (error) {
      console.error(`Error updating allergen: ${item.es}`, error.message);
    } else {
      console.log(`Updated allergen: ${item.es}`);
    }
  }

  console.log('Finished updating allergens.');
}

updateAllergens();
