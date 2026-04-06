'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { translations } from '@/lib/translations';
import { Search, LayoutGrid, Wine, Coffee, Utensils, Info, Camera, Globe, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { code: 'es', label: 'Castellano', flagUrl: 'https://flagcdn.com/w80/es.png' },
  { code: 'ca', label: 'Català', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Catalonia.svg/120px-Flag_of_Catalonia.svg.png' },
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w80/gb.png' },
  { code: 'de', label: 'Deutsch', flagUrl: 'https://flagcdn.com/w80/de.png' },
  { code: 'fr', label: 'Français', flagUrl: 'https://flagcdn.com/w80/fr.png' },
  { code: 'it', label: 'Italiano', flagUrl: 'https://flagcdn.com/w80/it.png' },
  { code: 'pt', label: 'Português', flagUrl: 'https://flagcdn.com/w80/pt.png' }
];

export default function MenuClient() {
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('comida');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeAllergenTooltip, setActiveAllergenTooltip] = useState<number | null>(null);
  const [showAllergenFilter, setShowAllergenFilter] = useState(false);
  const [excludedAllergenIds, setExcludedAllergenIds] = useState<string[]>([]);
  const [allAllergens, setAllAllergens] = useState<any[]>([]);

  useEffect(() => {
    setActiveAllergenTooltip(null);
  }, [selectedProduct]);

  const heroImages = [
    '/gallery/1_Interior.jpg',
    '/gallery/2_Exterior.jpg',
    '/gallery/3_Faro.jpg',
    '/gallery/4_MarEstatuas.jpg'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('cas-padri-lang');
    if (savedLang) {
      setLang(savedLang);
    } else {
      router.push('/');
      return;
    }
    fetchMenuData();

    const channel = supabase
      .channel('realtime-menu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchMenuData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMenuData = async () => {
    const { data: catData } = await supabase.from('categories').select('*').order('order');
    // Fetch products along with their allergens using the junction table
    const { data: prodData } = await supabase.from('products').select(`
      *,
      alergenos:producto_alergenos(
        alergeno:alergenos(*)
      )
    `)
    .eq('is_visible', true)
    .order('order');
    
    const { data: alData } = await supabase.from('alergenos').select('*').order('nombre_es');
    
    if (catData) setCategories(catData);
    if (prodData) setProducts(prodData);
    if (alData) setAllAllergens(alData);
    setLoading(false);
  };

  const t = (key: string) => translations[lang]?.[key] || translations['es'][key] || key;
  const getLoc = (obj: any, field: string) => obj[`${field}_${lang}`] || obj[`${field}_es`] || obj[field] || '...';

  const sections = ['comida', 'bebida', 'postre', 'vinos'];
  const currentSectionCategories = categories.filter(c => c.section === selectedSection);
  const activeCategoryId = selectedCategory || currentSectionCategories[0]?.id;
  const displayedProducts = products.filter(p => {
    const matchesCategory = p.is_visible && p.category_id === activeCategoryId;
    const matchesSearch = searchTerm === '' || getLoc(p, 'name').toLowerCase().includes(searchTerm.toLowerCase());
    const hasExcludedAllergen = p.alergenos?.some((a: any) => excludedAllergenIds.includes(a.alergeno.id));
    return matchesCategory && matchesSearch && !hasExcludedAllergen;
  });

  const getSectionIcon = (section: string) => {
    switch(section) {
      case 'comida': return <Utensils className="w-5 h-5" />;
      case 'bebida': return <Coffee className="w-5 h-5" />;
      case 'postre': return <LayoutGrid className="w-5 h-5" />;
      case 'vinos': return <Wine className="w-5 h-5" />;
      default: return <Utensils className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-jakarta pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col items-center flex-1">
          <div className="cas-padri-logo text-4xl mt-1">
            Cas Padrí
            <span className="cas-padri-year">1965</span>
          </div>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-2 opacity-60 mt-1">
            <img 
              src={languages.find(l => l.code === lang)?.flagUrl} 
              className="w-3.5 h-2.5 rounded-sm overflow-hidden object-cover"
              alt="flag"
            />
            {languages.find(l => l.code === lang)?.label}
          </p>
        </div>
        <button onClick={() => setShowLanguageModal(true)} className="p-2.5 rounded-full border border-white/10 bg-white/5 active:scale-90 transition-transform">
          <Globe className="w-5 h-5 text-primary" />
        </button>
      </header>

      {/* Hero with Restaurant Gallery Carousel */}
      <div className="relative h-60 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentHeroImage}
            src={heroImages[currentHeroImage]}
            initial={{ opacity: 0, scale: 1.1, filter: "grayscale(100%)" }}
            animate={{ opacity: 1, scale: 1, filter: "grayscale(0%)" }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        {/* Navigation Indicator Dots */}
        <div className="absolute top-6 right-6 flex gap-1.5 opacity-60">
          {heroImages.map((_, idx) => (
            <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === currentHeroImage ? 'w-4 bg-primary' : 'w-1 bg-white/20'}`} />
          ))}
        </div>

        <div className="absolute bottom-8 left-8">
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col gap-2"
           >
             <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest self-start">
               {t('digital_menu')}
             </span>
             <h2 className="text-4xl font-black capitalize tracking-tight">{t(selectedSection)}</h2>
           </motion.div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky top-[69px] z-30 bg-black/90 backdrop-blur-md border-b border-white/5 shadow-2xl">
        <div className="flex gap-3 px-6 overflow-x-auto custom-scrollbar py-4">
          {sections.map((section) => (
            <button key={section} onClick={() => { setSelectedSection(section); setSelectedCategory(null); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap text-xs font-black uppercase tracking-wider transition-all border ${
                selectedSection === section ? 'bg-primary text-black border-primary shadow-[0_10px_30px_-10px_rgba(236,182,19,0.4)]' : 'bg-zinc-900/50 text-zinc-600 border-zinc-800'
              }`}
            >
              {getSectionIcon(section)} {t(section)}
            </button>
          ))}
        </div>
        <div className="px-6 pb-4 flex gap-2 overflow-x-auto custom-scrollbar">
            {currentSectionCategories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-black uppercase tracking-widest transition-all ${
                  activeCategoryId === cat.id ? 'text-primary' : 'text-zinc-600'
                }`}
              >
                {getLoc(cat, 'name')}
              </button>
            ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 mt-8 space-y-8">
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
            <input type="text" placeholder={t('search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/30 transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => setShowAllergenFilter(true)}
            className={`flex-shrink-0 h-[56px] flex items-center gap-2 px-4 rounded-2xl transition-all border border-white/10 relative active:scale-95 cursor-pointer ${excludedAllergenIds.length > 0 ? 'bg-primary text-black border-primary shadow-lg shadow-primary/40' : 'bg-zinc-900/40 text-zinc-500'}`}
          >
            <Filter className={`w-4 h-4 ${excludedAllergenIds.length > 0 ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] font-black uppercase text-left leading-[1.15] max-w-[65px] break-words">
              {t('restrict_allergens')}
            </span>
            {excludedAllergenIds.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black shadow-lg border border-black/20 z-10">
                {excludedAllergenIds.length}
              </div>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
             <div className="flex flex-col items-center py-20 animate-pulse">
               <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">{t('syncing')}</p>
             </div>
          ) : displayedProducts.length > 0 ? (
            displayedProducts.map((p, idx) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedProduct(p)}
                className="flex gap-5 bg-gradient-to-br from-zinc-900/40 to-black p-3.5 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-zinc-800 flex-shrink-0 relative shadow-inner">
                  <img src={p.image_url && p.image_url.startsWith('http') ? p.image_url : 'https://via.placeholder.com/300?text=Cas+Padri'} alt={getLoc(p, 'name')} 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" 
                    onError={(e: any) => e.target.src = 'https://via.placeholder.com/300?text=Product'} 
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Search className="w-5 h-5 text-white/50" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-zinc-100 text-sm leading-tight pr-4 capitalize tracking-tight group-hover:text-primary transition-colors">{getLoc(p, 'name')}</h3>
                      <p className="text-primary font-black text-base italic">{p.price_main}€</p>
                    </div>
                    {getLoc(p, 'desc') && <p className="text-zinc-500 text-[10px] leading-relaxed line-clamp-2 italic font-medium opacity-80">{getLoc(p, 'desc')}</p>}
                  </div>
                  <div className="flex justify-between items-end border-t border-white/5 pt-3 mt-2">
                    <span className="text-[9px] text-zinc-600 font-black tracking-widest uppercase opacity-40">{p.product_code}</span>
                    {p.price_secondary && <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20">{t('glass')} {p.price_secondary}€</div>}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
             <div className="text-center py-20 px-10">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                   <Utensils className="w-6 h-6 text-zinc-800" />
                </div>
                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest leading-relaxed">{t('no_products')}</p>
             </div>
          )}
        </div>
      </div>

      {/* Language Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-md bg-zinc-900 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
              <div className="flex flex-col items-center mb-8">
                 <Globe className="w-12 h-12 text-primary mb-4 animate-pulse" />
                 <h3 className="text-2xl font-black text-center text-white tracking-tight">{t('select_language')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {languages.map(l => (
                  <motion.button key={l.code} 
                    whileHover={{ scale: 1.05 }}
                    whileFocus={{ scale: 1.05 }}
                    onClick={() => { setLang(l.code); localStorage.setItem('cas-padri-lang', l.code); setShowLanguageModal(false); }}
                    className={`flex flex-col items-center justify-center p-5 rounded-3xl border transition-all ${lang === l.code ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20 scale-[1.05]' : 'bg-white/5 border-white/5 text-zinc-500 active:scale-95 text-center'}`}
                  >
                    <div className="w-12 h-8 mb-2 rounded-md overflow-hidden shadow-lg border border-white/5">
                      <img 
                        src={l.flagUrl} 
                        alt={l.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-widest">{l.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveAllergenTooltip(null);
              }}
              className="w-full max-w-lg bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl flex flex-col max-h-[90vh]"
            >
              <div className="relative w-full bg-zinc-950 flex items-center justify-center p-2 min-h-[300px]">
                <img 
                  src={selectedProduct.image_url && selectedProduct.image_url.startsWith('http') ? selectedProduct.image_url : 'https://via.placeholder.com/600?text=Cas+Padri'} 
                  className="w-full h-auto max-h-[60vh] object-contain"
                  alt={getLoc(selectedProduct, 'name')}
                />
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-6 right-6 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-black/80 transition-all z-20"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10 pb-12 relative z-10 bg-zinc-900 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-3xl font-black tracking-tighter italic text-white leading-none">
                    {getLoc(selectedProduct, 'name')}
                  </h3>
                  <div className="text-2xl font-black text-primary italic">
                    {selectedProduct.price_main}€
                  </div>
                </div>
                
                {getLoc(selectedProduct, 'desc') && (
                  <p className="text-zinc-400 text-sm leading-relaxed italic font-medium mb-8">
                    {getLoc(selectedProduct, 'desc')}
                  </p>
                )}
                
                <div className="flex flex-col gap-6 pt-6 border-t border-white/5">
                  {/* Allergens Section */}
                  {selectedProduct.alergenos && selectedProduct.alergenos.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Alérgenos / Allergens</p>
                      <div className="flex flex-wrap gap-4">
                        {selectedProduct.alergenos.map((item: any, i: number) => (
                          <div 
                            key={i} 
                            className="group/al relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAllergenTooltip(activeAllergenTooltip === i ? null : i);
                            }}
                          >
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-black/40 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer">
                              <img 
                                src={item.alergeno.icono_url} 
                                alt={item.alergeno.nombre_es} 
                                className="w-full h-full object-cover rounded-full"
                                title={item.alergeno.nombre_es}
                              />
                            </div>
                            {/* Tooltip */}
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-[8px] font-black uppercase tracking-widest text-primary rounded border border-white/10 whitespace-nowrap transition-opacity pointer-events-none z-40 ${activeAllergenTooltip === i ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover/al:opacity-100 group-hover/al:scale-100'}`}>
                              {getLoc(item.alergeno, 'nombre')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                      Ref. {selectedProduct.product_code}
                    </div>
                    {selectedProduct.price_secondary && (
                      <div className="ml-auto bg-primary text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {t('glass')} {selectedProduct.price_secondary}€
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Allergen Filter Modal */}
      <AnimatePresence>
        {showAllergenFilter && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-md bg-zinc-900 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex flex-col items-center mb-6">
                <Filter className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-black text-center text-white tracking-tight">{t('allergen_filter_title')}</h3>
                {excludedAllergenIds.length > 0 && (
                  <button onClick={() => setExcludedAllergenIds([])} className="mt-2 text-primary text-[10px] font-black uppercase tracking-widest hover:underline">
                    {t('clear_filters')}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar py-4 px-1">
                {allAllergens.map(al => {
                  const isExcluding = excludedAllergenIds.includes(al.id);
                  return (
                    <motion.button 
                      key={al.id} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (isExcluding) setExcludedAllergenIds(prev => prev.filter(id => id !== al.id));
                        else setExcludedAllergenIds(prev => [...prev, al.id]);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-[2rem] border transition-all ${
                        isExcluding 
                          ? 'bg-primary border-primary shadow-lg shadow-primary/30 text-black' 
                          : 'bg-zinc-900/40 border-white/10 text-zinc-500 shadow-sm'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-full overflow-hidden border ${isExcluding ? 'border-black/10' : 'border-white/10'} bg-black p-0.5 mb-2 shadow-inner`}>
                        <img 
                          src={al.icono_url} 
                          alt={getLoc(al, 'nombre')}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-tight text-center leading-tight ${isExcluding ? 'text-black' : 'text-zinc-500'}`}>
                        {getLoc(al, 'nombre')}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowAllergenFilter(false)}
                className="mt-8 w-full bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 z-40 px-6 py-3 bg-gradient-to-t from-black via-black to-transparent">
         <motion.div 
           whileTap={{ scale: 0.98 }} 
           onClick={() => router.push('/info')}
           className="bg-primary text-black py-2.5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_15px_40px_-10px_rgba(236,182,19,0.7)] cursor-pointer"
         >
            <Info className="w-4.5 h-4.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('more_info')}</span>
         </motion.div>
      </footer>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236, 182, 19, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(236, 182, 19, 0.6); }
      `}</style>
    </div>
  );
}
