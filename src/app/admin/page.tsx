'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadProductImage } from '@/lib/storage';
import { translations } from '@/lib/translations';
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, LayoutDashboard, Upload, Check, X, Save, Globe, MoreHorizontal, Utensils, Coffee, LayoutGrid, Wine, Camera, LogOut, Bell, Send, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const languages = ['es', 'ca', 'en', 'de', 'fr', 'it', 'pt'];

export default function AdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('comida');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'idle' | 'uploading' | 'success' | 'error' }>({});
  const [allAllergens, setAllAllergens] = useState<any[]>([]);
  const [productAllergens, setProductAllergens] = useState<string[]>([]);
  const [isPushFormOpen, setIsPushFormOpen] = useState(false);
  const [pushData, setPushData] = useState({ title: '', body: '', url: '' });
  const [pushSending, setPushSending] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    fetchData();
    const productSubscription = supabase
      .channel('products-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(productSubscription); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from('categories').select('*').order('order');
    const { data: prodData } = await supabase.from('products').select('*, categories(name_es)').order('order');
    const { data: allAlData } = await supabase.from('alergenos').select('*').order('nombre_es');
    if (catData) setCategories(catData);
    if (prodData) setProducts(prodData);
    if (allAlData) setAllAllergens(allAlData);
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Clean ALL virtual and non-primitive fields before updating database
    const dataToUpdate = { ...editingProduct };
    delete dataToUpdate.categories;
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    
    // Safety check: remove any other nested objects that might come from joins
    Object.keys(dataToUpdate).forEach(key => {
      if (typeof dataToUpdate[key] === 'object' && dataToUpdate[key] !== null) {
        delete dataToUpdate[key];
      }
    });

    let error;
    if (editingProduct.id) {
      const { error: updateError } = await supabase.from('products').update(dataToUpdate).eq('id', editingProduct.id);
      error = updateError;
      
      // Sync Allergens (N:M)
      if (!error) {
        await supabase.from('producto_alergenos').delete().eq('producto_id', editingProduct.id);
        const allergenInserts = productAllergens.map(alId => ({
            producto_id: editingProduct.id,
            alergeno_id: alId
        }));
        if (allergenInserts.length > 0) {
            await supabase.from('producto_alergenos').insert(allergenInserts);
        }
      }
    } else {
      const { data: newProd, error: insertError } = await supabase.from('products').insert(dataToUpdate).select().single();
      error = insertError;
      
      // New product allergens sync
      if (!error && productAllergens.length > 0) {
        const allergenInserts = productAllergens.map(alId => ({
            producto_id: newProd.id,
            alergeno_id: alId
        }));
        await supabase.from('producto_alergenos').insert(allergenInserts);
      }
    }

    if (error) {
      console.error('Full Supabase Error:', error);
      alert(`Error: ${error.message}`);
    } else {
      setEditingProduct(null);
      setProductAllergens([]);
      fetchData();
    }
    setIsSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, productCode: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus(prev => ({ ...prev, [productCode]: 'uploading' }));
    const result = await uploadProductImage(file, productCode);
    if (result.success) {
      setUploadStatus(prev => ({ ...prev, [productCode]: 'success' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, [productCode]: 'idle' })), 2000);
      fetchData();
    } else {
      setUploadStatus(prev => ({ ...prev, [productCode]: 'error' }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const toggleVisibility = async (id: string, currentVisible: boolean) => {
    await supabase.from('products').update({ is_visible: !currentVisible }).eq('id', id);
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setPushSending(true);
    try {
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushData),
      });
      const result = await response.json();
      if (result.success) {
        alert(`¡Éxito! Notificación enviada a ${result.count} dispositivos.`);
        setIsPushFormOpen(false);
        setPushData({ title: '', body: '', url: '' });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      alert(`Error al enviar: ${err.message}`);
    } finally {
      setPushSending(false);
    }
  };

  const handleTranslate = async () => {
    if (!editingProduct.name_es && !editingProduct.desc_es) {
      alert('⚠️ Por favor, introduce primero el nombre o la descripción en español.');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingProduct.name_es,
          description: editingProduct.desc_es
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setEditingProduct({
        ...editingProduct,
        ...data
      });
    } catch (err: any) {
      console.error('Translate error:', err);
      alert(`Error en traducción: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const sections = ['comida', 'bebida', 'postre', 'vinos'];
  const currentSectionCategories = categories.filter(c => c.section === selectedSection);
  const activeCategoryId = selectedCategory || currentSectionCategories[0]?.id;

  const filteredProducts = products.filter(p => 
    (p.category_id === activeCategoryId) &&
    (p.name_es?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSectionIcon = (section: string) => {
    switch(section) {
      case 'comida': return <Utensils className="w-5 h-5" />;
      case 'bebida': return <Coffee className="w-5 h-5" />;
      case 'postre': return <LayoutGrid className="w-5 h-5" />;
      case 'vinos': return <Wine className="w-5 h-5" />;
      default: return <Utensils className="w-5 h-5" />;
    }
  };

  const createNewProduct = () => {
    // Generar un código de producto temporal basado en timestamp
    const tempCode = `NEW-${Date.now()}`;
    setEditingProduct({
      category_id: activeCategoryId,
      product_code: tempCode,
      name_es: '',
      price_main: 0,
      is_visible: true,
      order: 0
    });
  };

  return (
    <div className="h-screen bg-black text-zinc-100 flex flex-col font-jakarta overflow-hidden">
      {/* 1. Header Fijo Superior */}
      <header className="flex-shrink-0 bg-black border-b border-white/10 px-10 py-2 flex items-center justify-between z-40">
        <div className="w-32 flex justify-start">
           <button 
             onClick={() => setIsPushFormOpen(true)}
             className="group flex items-center justify-center p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
             title="Enviar Notificación Push"
           >
             <Bell className="w-4 h-4" />
           </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="cas-padri-logo text-3xl">
            Cas Padrí
            <span className="cas-padri-year">Admin Panel • 1965</span>
          </div>
        </div>
        <div className="w-32 flex justify-end">
           <button onClick={handleLogout} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all">
             <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Salir</span>
             <LogOut className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </header>

      {/* 1.5 Selectores en Cascada (Estilo Cliente Mejorado) */}
      <div className="bg-black px-10 pt-2 flex flex-col gap-2 flex-shrink-0">
        {/* Section Tabs (Food, Drink, etc) */}
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 min-w-0">
            {sections.map((section) => {
              const isActive = selectedSection === section;
              return (
                <button 
                  key={section} 
                  onClick={() => { setSelectedSection(section); setSelectedCategory(null); }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl whitespace-nowrap text-[9px] font-black uppercase tracking-widest transition-all border-2 relative flex-shrink-0 ${
                    isActive 
                      ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' 
                      : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {getSectionIcon(section)} 
                  <span>{translations['es'][section]}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="section-active-glow"
                      className="absolute inset-0 bg-white/10 rounded-3xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Category Tabs (Subcategories) */}
        <div className="flex flex-col gap-1">
          <div className="flex gap-6 overflow-x-auto custom-scrollbar pt-1 pb-2 min-w-0">
            {currentSectionCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 pb-1 text-[9px] font-black uppercase tracking-[0.25em] transition-all relative ${
                    isActive ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {cat.name_es}
                </button>
              );
            })}
          </div>
          
          {/* Search and Action Bar */}
          <div className="flex items-center justify-between gap-4 pb-1">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input 
                type="text" 
                placeholder="Buscar en categoría..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-10 pr-6 text-[12px] focus:outline-none focus:border-primary/40 focus:bg-zinc-800/50 transition-all font-semibold placeholder:text-zinc-700 shadow-inner"
              />
            </div>
            
            <button 
              onClick={createNewProduct}
              className="flex-shrink-0 bg-primary text-black px-4 py-2 rounded-lg font-black uppercase text-[8px] tracking-tight flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10"
            >
              <Plus className="w-3 h-3 stroke-[4]" /> NUEVO PRODUCTO
            </button>
          </div>
        </div>
      </div>

      {/* 2. Área de Tabla con Scroll */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-10 pt-1 pb-4">
        <div className="flex-1 flex flex-col bg-zinc-900/10 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl relative">
          
          {/* Encabezado Fijo de la Tabla */}
          <div className="flex-shrink-0 bg-zinc-900/40 backdrop-blur-md border-b border-white/10 z-20">
             <div className="flex text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em] min-w-[700px]">
                <div className="px-6 py-3 w-[350px] flex-shrink-0">Producto / Identificador</div>
                <div className="px-6 py-3 w-24 text-center border-l border-white/5">Precio</div>
                <div className="px-6 py-3 w-32 text-center border-l border-white/5">Estado</div>
                <div className="px-1 py-3 w-[50px] text-center border-l border-white/5">Edit</div>
             </div>
          </div>

          {/* Cuerpo de la Tabla con Scroll Vertical y Horizontal */}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
             <div className="min-w-[700px] divide-y divide-white/10">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="flex group hover:bg-white/[0.02] transition-colors items-center">
                    <div className="px-6 py-2.5 w-[350px] flex-shrink-0 cursor-default">
                      <div className="flex items-center gap-6">
                        <div className="relative group/img w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 shadow-lg">
                           <img src={p.image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-500" />
                           <label className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-300">
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, p.product_code)} />
                              {uploadStatus[p.product_code] === 'uploading' ? <div className="animate-spin border-2 border-primary border-t-transparent w-3.5 h-3.5 rounded-full" /> : <Upload className="w-3.5 h-3.5 text-primary" />}
                           </label>
                        </div>
                        <div>
                          <p className="font-bold text-base group-hover:text-primary transition-colors duration-300">{p.name_es}</p>
                          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1 flex items-center gap-2">
                            {p.product_code}
                            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                            {p.categories?.name_es}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-2.5 w-24 text-center border-l border-white/5">
                      <div className="text-sm font-black text-white">{p.price_main}€</div>
                      {p.price_secondary && <div className="text-[9px] text-zinc-500 mt-0.5 font-bold uppercase tracking-wider">{p.price_secondary}€</div>}
                    </div>
                    <div className="px-6 py-2.5 w-32 text-center border-l border-white/5">
                       <button onClick={() => toggleVisibility(p.id, p.is_visible)} 
                         className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm ${
                           p.is_visible 
                             ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                             : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                         }`}>
                         <span className={`w-0.5 h-0.5 rounded-full ${p.is_visible ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                         {p.is_visible ? 'En Carta' : 'Oculto'}
                       </button>
                    </div>
                    <div className="px-1 py-2.5 w-[50px] text-center border-l border-white/5">
                       <button onClick={async () => {
                          setEditingProduct(p);
                          // Fetch current allergens for this product
                          const { data: relAl } = await supabase
                            .from('producto_alergenos')
                            .select('alergeno_id')
                            .eq('producto_id', p.id);
                          if (relAl) setProductAllergens(relAl.map(r => r.alergeno_id));
                        }} className="p-2 text-zinc-500 hover:text-primary bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-md hover:scale-105 active:scale-95 transition-all shadow-xl mx-auto">
                          <Edit2 className="w-3 h-3" />
                       </button>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="p-32 text-center flex flex-col items-center justify-center gap-4">
                     <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent shadow-[0_0_20px_rgba(236,182,19,0.2)]" />
                     <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 animate-pulse">Cargando catálogo...</p>
                  </div>
                )}

                {!loading && filteredProducts.length === 0 && (
                   <div className="p-32 text-center flex flex-col items-center justify-center gap-4 bg-black/40">
                      <LayoutGrid className="w-12 h-12 text-zinc-800" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-600">No se encontraron productos</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </main>

      {/* Slide-over Form (sin cambios, ya era funcional) */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end"
          >
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-2xl h-full bg-zinc-900 p-10 border-l border-white/10 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black tracking-tight italic">{editingProduct.id ? 'Editar' : 'Crear'} <span className="text-primary not-italic">{editingProduct.name_es || 'Nuevo Producto'}</span></h2>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-8">
                <div className="col-span-2 space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">Imagen del Producto</h3>
                   <div className="relative group/formimg w-full h-56 bg-black/40 border-2 border-dashed border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center transition-all hover:border-primary/40 group-focus-within:border-primary/40 shadow-inner">
                      {editingProduct.image_url ? (
                        <>
                          <img src={editingProduct.image_url} className="w-full h-full object-contain opacity-70 group-hover/formimg:opacity-30 transition-all duration-500" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/formimg:opacity-100 transition-all duration-300">
                             <div className="p-4 bg-primary rounded-full shadow-2xl scale-75 group-hover/formimg:scale-100 transition-transform">
                                <Camera className="w-8 h-8 text-black" />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-4">Cambiar fotografía</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4 transition-transform group-hover/formimg:scale-110 duration-500">
                           <div className="p-6 bg-zinc-900/50 rounded-full border border-white/5 shadow-xl">
                              <Upload className="w-10 h-10 text-zinc-700" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Haz clic para subir imagen</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const currentCode = editingProduct.product_code;
                          if (!currentCode) {
                            alert("Introduce un código de producto primero para nombrar el archivo correctamente.");
                            return;
                          }

                          setUploadStatus(prev => ({ ...prev, [currentCode]: 'uploading' }));
                          const result = await uploadProductImage(file, currentCode);
                          if (result.success) {
                            setEditingProduct({ ...editingProduct, image_url: result.url });
                            setUploadStatus(prev => ({ ...prev, [currentCode]: 'success' }));
                            setTimeout(() => setUploadStatus(prev => ({ ...prev, [currentCode]: 'idle' })), 2000);
                          } else {
                            setUploadStatus(prev => ({ ...prev, [currentCode]: 'error' }));
                            alert(`Error: ${result.error}`);
                          }
                        }} 
                      />
                      {uploadStatus[editingProduct.product_code] === 'uploading' && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                           <div className="animate-spin border-4 border-primary border-t-transparent w-12 h-12 rounded-full shadow-[0_0_20px_rgba(236,182,19,0.3)]" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Subiendo a storage...</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="col-span-2 space-y-6">
                    <div className="flex items-center justify-between bg-zinc-800/20 p-4 rounded-[2rem] border border-white/5">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">Traducciones</h3>
                        <button 
                            type="button"
                            onClick={handleTranslate}
                            disabled={isTranslating}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                                isTranslating 
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                    : 'bg-primary text-black hover:scale-105 active:scale-95 shadow-primary/20'
                            }`}
                        >
                            {isTranslating ? (
                                <div className="animate-spin border-2 border-zinc-500 border-t-transparent w-3 h-3 rounded-full" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                            )}
                            {isTranslating ? 'Traduciendo...' : 'Traducir con AI'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {languages.map(code => (
                        <div key={code} className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center justify-between">
                            <span>{code.toUpperCase()}</span>
                            <span className="text-[8px] opacity-40">Nombre y Descripción</span>
                          </label>
                          <input type="text" placeholder="Nombre del producto..." value={editingProduct[`name_${code}`] || ''} 
                            onChange={(e) => setEditingProduct({...editingProduct, [`name_${code}`]: e.target.value})}
                            className="w-full bg-black/60 border border-white/5 rounded-xl py-3 px-4 text-xs focus:border-primary/50 transition-all font-bold placeholder:font-normal placeholder:opacity-30"
                          />
                          <textarea placeholder="Descripción del producto..." value={editingProduct[`desc_${code}`] || ''} 
                            onChange={(e) => setEditingProduct({...editingProduct, [`desc_${code}`]: e.target.value})}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-[11px] focus:border-primary/50 transition-all font-medium min-h-[80px] resize-none placeholder:opacity-30"
                          />
                        </div>
                      ))}
                    </div>
                 </div>

                 <div className="col-span-2 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">Información Alimentaria (Alérgenos)</h3>
                    <div className="flex flex-wrap gap-2">
                        {allAllergens.map(al => {
                            const isSelected = productAllergens.includes(al.id);
                            return (
                                <button 
                                    key={al.id}
                                    type="button"
                                    onClick={() => {
                                        if (isSelected) setProductAllergens(prev => prev.filter(id => id !== al.id));
                                        else setProductAllergens(prev => [...prev, al.id]);
                                    }}
                                    className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        isSelected 
                                            ? 'bg-primary/20 text-primary border-primary shadow-[0_0_15px_rgba(236,182,19,0.2)]' 
                                            : 'bg-black/40 text-zinc-600 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    {al.nombre_es}
                                </button>
                            );
                        })}
                    </div>
                    {allAllergens.length === 0 && (
                        <p className="text-[10px] text-zinc-700 font-bold italic">⚠️ Tabla de alérgenos vacía o no ejecutada en Supabase.</p>
                    )}
                 </div>

                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">Precios y Código</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2 px-1">Código Estándar</label>
                          <input type="text" value={editingProduct.product_code} 
                            onChange={(e) => setEditingProduct({...editingProduct, product_code: e.target.value})}
                            className="w-full bg-black/60 border border-white/5 rounded-xl py-3 px-4 text-xs font-mono focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2 px-1">Posición / Orden</label>
                          <input type="number" value={editingProduct.order || 0} 
                            onChange={(e) => setEditingProduct({...editingProduct, order: parseInt(e.target.value) || 0})}
                            className="w-full bg-black/60 border border-white/5 rounded-xl py-3 px-4 text-xs font-bold focus:border-primary/50 transition-all text-center" />
                        </div>
                      </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block px-1">Precio Principal (€)</label>
                           <input type="number" step="0.01" value={editingProduct.price_main || ''} 
                             onChange={(e) => setEditingProduct({...editingProduct, price_main: parseFloat(e.target.value)})}
                             className="w-full bg-black border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-primary" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block px-1">Precio Copa (€)</label>
                           <input type="number" step="0.01" value={editingProduct.price_secondary || ''} 
                             onChange={(e) => setEditingProduct({...editingProduct, price_secondary: parseFloat(e.target.value)})}
                             className="w-full bg-black border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-zinc-300"
                           />
                        </div>
                     </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">Estado Público</h3>
                   <button type="button" onClick={() => setEditingProduct({...editingProduct, is_visible: !editingProduct.is_visible})}
                     className={`w-full flex items-center justify-center gap-4 p-8 rounded-[2rem] border-2 transition-all group ${editingProduct.is_visible ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {editingProduct.is_visible ? <Eye className="w-10 h-10 animate-pulse" /> : <EyeOff className="w-10 h-10" />}
                      <span className="font-black text-sm uppercase tracking-widest">{editingProduct.is_visible ? 'En Carta Digital' : 'No Publicado'}</span>
                   </button>
                </div>

                <div className="col-span-2 pt-10 border-t border-white/5 mt-auto flex gap-4 text-center">
                  <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-4 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-xs opacity-60 hover:opacity-100">Descartar</button>
                  <button type="submit" disabled={isSaving}
                    className="flex-[2] bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/10 hover:shadow-primary/30 active:scale-95 transition-all">
                    {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent flex-shrink-0" /> : <Save className="w-4 h-4" />}
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Form for Push Notifications */}
      <AnimatePresence>
        {isPushFormOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end"
          >
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md h-full bg-zinc-900 p-10 border-l border-white/10 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                      <Bell className="w-6 h-6 text-primary" />
                   </div>
                   <h2 className="text-2xl font-black tracking-tight italic">Enviar <span className="text-primary not-italic">Notificación</span></h2>
                </div>
                <button onClick={() => setIsPushFormOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSendPush} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Título del mensaje</label>
                  <input 
                    type="text" 
                    placeholder="Ej: ¡Nuevo plato disponible!" 
                    required
                    value={pushData.title}
                    onChange={(e) => setPushData({...pushData, title: e.target.value})}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 px-5 text-sm focus:border-primary/50 transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cuerpo de la notificación</label>
                  <textarea 
                    placeholder="Escribe aquí el contenido de la notificación..." 
                    required
                    value={pushData.body}
                    onChange={(e) => setPushData({...pushData, body: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-4 px-5 text-sm focus:border-primary/50 transition-all font-medium min-h-[120px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">URL de destino (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: /menu" 
                    value={pushData.url}
                    onChange={(e) => setPushData({...pushData, url: e.target.value})}
                    className="w-full bg-black/60 border border-white/5 rounded-xl py-4 px-5 text-xs focus:border-primary/50 transition-all font-mono"
                  />
                  <p className="text-[10px] text-zinc-600 px-1 italic">Si se deja vacío, abrirá la página principal.</p>
                </div>

                <div className="pt-10 border-t border-white/5 mt-auto flex gap-4 text-center">
                  <button 
                    type="button" 
                    onClick={() => setIsPushFormOpen(false)} 
                    className="flex-1 py-4 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-xs opacity-60 hover:opacity-100"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={pushSending}
                    className="flex-[2] bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/10 hover:shadow-primary/30 active:scale-95 transition-all"
                  >
                    {pushSending ? <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent flex-shrink-0" /> : <Send className="w-4 h-4" />}
                    ENVIAR AHORA
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236, 182, 19, 0.4); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(236, 182, 19, 0.8); }
      `}</style>
    </div>
  );
}
