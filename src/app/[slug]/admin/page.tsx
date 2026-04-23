'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadProductImage } from '@/lib/storage';
import { 
  Search, Plus, Edit2, Trash2, Save, X, LogOut, 
  Upload, LayoutGrid, Utensils, Settings, 
  MapPin, Phone, Mail, Palette, Image as ImageIcon,
  Sparkles, Bell, Map as MapIcon, ExternalLink, Instagram, Facebook,
  Coffee, Wine, IceCream, ChevronRight, Clock
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Restaurant, getRestaurantBySlug } from '@/lib/restaurant';
import { motion, AnimatePresence } from 'framer-motion';

const defaultHours = [
  { day: 'Lunes', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: false },
  { day: 'Martes', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: false },
  { day: 'Miércoles', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: false },
  { day: 'Jueves', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: false },
  { day: 'Viernes', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: false },
  { day: 'Sábado', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: false },
  { day: 'Domingo', open1: '09:00', close1: '14:00', open2: '17:00', close2: '22:00', closed: true },
];

export default function AdminDashboard() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'hours' | 'settings' | 'push'>('products');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  
  // Filtering
  const [selectedSection, setSelectedSection] = useState('comida');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Data State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allAllergens, setAllAllergens] = useState<any[]>([]);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [productAllergens, setProductAllergens] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({});

  // Push Stats
  const [pushData, setPushData] = useState({ title: '', body: '', url: '' });
  const [pushSending, setPushSending] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${slug}/admin/login`);
        return;
      }
      const res = await getRestaurantBySlug(slug);
      if (!res) {
        router.push('/');
        return;
      }

      // Inicializar horarios si no existen
      if (!res.working_hours || res.working_hours.length === 0) {
        res.working_hours = defaultHours;
      }
      
      setRestaurant(res);
      fetchData(res.id);

      const channel = supabase
        .channel(`admin-sync-${res.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `restaurant_id=eq.${res.id}` }, () => fetchData(res.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `restaurant_id=eq.${res.id}` }, () => fetchData(res.id))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [slug]);

  const fetchData = async (restaurantId: string) => {
    const { data: catData } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('order');
    const { data: prodData } = await supabase.from('products').select('*, categories(*)').eq('restaurant_id', restaurantId).order('order');
    const { data: allAlData } = await supabase.from('alergenos').select('*').order('nombre_es');
    
    if (catData) setCategories(catData);
    if (prodData) setProducts(prodData);
    if (allAlData) setAllAllergens(allAlData);
    setLoading(false);
  };

  const translateAI = async () => {
    if (!editingProduct?.name_es) return alert('Escribe el nombre en español primero.');
    setLoadingTranslations(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingProduct.name_es, description: editingProduct.desc_es })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setEditingProduct({ ...editingProduct, ...data });
    } catch (err: any) {
      alert(`Error al traducir: ${err.message}`);
    } finally {
      setLoadingTranslations(false);
    }
  };

  const handleProductUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setIsSaving(true);
    const dataToUpdate = { ...editingProduct };
    delete dataToUpdate.categories;
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    dataToUpdate.restaurant_id = restaurant.id;

    if (editingProduct.id) {
       await supabase.from('products').update(dataToUpdate).eq('id', editingProduct.id);
       await supabase.from('producto_alergenos').delete().eq('producto_id', editingProduct.id);
       const allergenInserts = productAllergens.map(alId => ({ producto_id: editingProduct.id, alergeno_id: alId }));
       if (allergenInserts.length > 0) await supabase.from('producto_alergenos').insert(allergenInserts);
    } else {
       const { data: newProd } = await supabase.from('products').insert(dataToUpdate).select().single();
       if (newProd && productAllergens.length > 0) {
         const allergenInserts = productAllergens.map(alId => ({ producto_id: newProd.id, alergeno_id: alId }));
         await supabase.from('producto_alergenos').insert(allergenInserts);
       }
    }
    setEditingProduct(null); 
    fetchData(restaurant.id);
    setIsSaving(false);
  };

  const translateCategoryAI = async () => {
    if (!editingCategory?.name_es) return alert('Escribe el nombre en español primero.');
    setLoadingTranslations(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategory.name_es, description: '' })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      // Filtramos solo los campos de nombre
      const nameOnlyData: any = {};
      Object.keys(data).forEach(key => {
        if (key.startsWith('name_')) nameOnlyData[key] = data[key];
      });
      
      setEditingCategory({ ...editingCategory, ...nameOnlyData });
    } catch (err: any) {
      alert(`Error al traducir categoría: ${err.message}`);
    } finally {
      setLoadingTranslations(false);
    }
  };

  const handleCategoryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setIsSaving(true);
    const dataToUpdate = { ...editingCategory };
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    dataToUpdate.restaurant_id = restaurant.id;

    if (editingCategory.id) await supabase.from('categories').update(dataToUpdate).eq('id', editingCategory.id);
    else await supabase.from('categories').insert(dataToUpdate);
    
    setEditingCategory(null);
    fetchData(restaurant.id);
    setIsSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('¿Seguro? Se borrarán todos los productos de esta categoría.')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData(restaurant!.id);
  };

  const updateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setIsSaving(true);
    
    try {
      // Limpiamos el objeto por si tiene campos nulos o extraños
      const updateData = {
        name: restaurant.name,
        logo_url: restaurant.logo_url,
        hero_images: restaurant.hero_images,
        address: restaurant.address,
        google_maps_url: restaurant.google_maps_url,
        phone: restaurant.phone,
        email: restaurant.email,
        primary_color: restaurant.primary_color,
        instagram_username: restaurant.instagram_username,
        facebook_url: restaurant.facebook_url,
        working_hours: restaurant.working_hours, // AÑADIDO: Guardado de horarios
      };

      const { error, count, status } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('slug', slug); // Usamos el slug como identificador principal para mayor seguridad

      if (error) throw error;
      
      // Si el status es 200 o 204 pero no se ha modificado nada
      if (status === 204 || status === 200) {
        alert('¡Cambios guardados con éxito!');
        // Forzamos una recarga ligera de los datos locales
        setRestaurant({...restaurant, ...updateData});
      } else {
        throw new Error(`Estado inesperado: ${status}`);
      }

    } catch (err: any) {
      console.error('Error detallado al guardar:', err);
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, currentCode: string, productId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;

    // Generamos un nombre único basado en el tiempo para evitar duplicados
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${slug}/${fileName}`; // RUTA: Carpeta del restaurante en products
    
    setUploadStatus(prev => ({ ...prev, [currentCode]: 'uploading' }));

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      // Aquí actualizamos el producto en la DB
      const idToUpdate = productId || (editingProduct?.id);
      if (idToUpdate) {
        await supabase.from('products').update({ image_url: publicUrl }).eq('id', idToUpdate);
      }

      setUploadStatus(prev => ({ ...prev, [currentCode]: 'success' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, [currentCode]: 'idle' })), 2000);
      fetchData(restaurant.id);

    } catch (error: any) {
      console.error('Error al subir imagen de producto:', error);
      alert(`Error al subir imagen: ${error.message}`);
      setUploadStatus(prev => ({ ...prev, [currentCode]: 'error' }));
    }
  };

  const handleBrandingUpload = async (file: File, type: 'logo' | 'hero') => {
    if (!restaurant) return;
    const fileName = `${type}_${Date.now()}`;
    const filePath = `${slug}/${fileName}`; // RUTA: Carpeta del restaurante

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      if (type === 'logo') {
        setRestaurant({ ...restaurant, logo_url: publicUrl });
      } else {
        setRestaurant({ ...restaurant, hero_images: [...(restaurant.hero_images || []), publicUrl] });
      }
    } catch (error: any) {
      console.error('Error al subir imagen de marca:', error);
      alert(`Error al subir: ${error.message}`);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#050505]">
      <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  const primaryColor = restaurant?.primary_color || '#D4AF37';

  // --- FILTERED DATA ---
  const currentCategories = categories.filter(c => c.section === selectedSection);
  const currentProducts = products.filter(p => {
    const matchesSection = p.categories?.section === selectedSection;
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchTerm || p.name_es.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans flex flex-col">
      {/* COMPACT TOP HEADER */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 py-2 lg:py-3">
        <div className="px-4 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10" style={{ color: primaryColor }}>
                        <Utensils className="w-5 h-5" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-tighter hidden sm:block">
                        {restaurant?.name} <span className="text-zinc-500 font-medium ml-1">Panel</span>
                    </span>
                </div>

                <nav className="flex items-center gap-1">
                    {[
                      { id: 'products', label: 'Carta', icon: <Utensils className="w-4 h-4" /> },
                      { id: 'categories', label: 'Categorías', icon: <LayoutGrid className="w-4 h-4" /> },
                      { id: 'hours', label: 'Horario', icon: <Clock className="w-4 h-4" /> },
                      { id: 'settings', label: 'Marca', icon: <Settings className="w-4 h-4" /> },
                      { id: 'push', label: 'Push', icon: <Bell className="w-4 h-4" /> },
                    ].map(tab => (
                        <button 
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${
                            activeTab === tab.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/5'
                          }`}
                        >
                            <span style={activeTab === tab.id ? { color: primaryColor } : {}}>{tab.icon}</span>
                            <span className="hidden md:block">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <button onClick={async () => { await supabase.auth.signOut(); router.push(`/${slug}/admin/login`); }} className="p-2 text-zinc-600 hover:text-red-500 transition-all">
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* SUB-HEADER: SECTION SELECTION (Like CLIENT MENU) */}
      {(activeTab === 'products' || activeTab === 'categories') && (
        <div className="bg-black/40 border-b border-white/5 py-3 px-4 lg:px-8 overflow-x-auto no-scrollbar flex items-center gap-2">
            {[
                { id: 'comida', label: 'Comida', icon: <Utensils className="w-3.5 h-3.5" /> },
                { id: 'bebida', label: 'Bebida', icon: <Coffee className="w-3.5 h-3.5" /> },
                { id: 'postre', label: 'Postre', icon: <IceCream className="w-3.5 h-3.5" /> },
                { id: 'vinos', label: 'Vinos', icon: <Wine className="w-3.5 h-3.5" /> },
            ].map(sec => (
                <button 
                    key={sec.id}
                    onClick={() => { setSelectedSection(sec.id); setSelectedCategory(null); }}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                        selectedSection === sec.id ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/30'
                    }`}
                >
                    {sec.icon} {sec.label}
                </button>
            ))}
        </div>
      )}

      {/* CONTENT AREA */}
      <main className="flex-1 px-4 lg:px-8 py-6">
           
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                   <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">GESTIONAR</h2>
                   <h1 className="text-3xl font-black uppercase tracking-tighter italic leading-none">
                      {activeTab === 'products' ? `Productos (${selectedSection})` : ''}
                      {activeTab === 'categories' ? `Categorías (${selectedSection})` : ''}
                      {activeTab === 'settings' ? 'Identidad de Marca' : ''}
                      {activeTab === 'push' ? 'Notificaciones Push' : ''}
                   </h1>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'products' && (
                        <button onClick={() => setEditingProduct({ 
                             name_es: '', 
                             price_main: 0, 
                             is_visible: true, 
                             category_id: selectedCategory || (currentCategories[0]?.id || ''),
                             order: currentProducts.length,
                             name_ca: '', name_en: '', name_de: '', name_fr: '', name_it: '', name_pt: '',
                             desc_es: '', desc_ca: '', desc_en: '', desc_de: '', desc_fr: '', desc_it: '', desc_pt: '',
                             product_code: '',
                             price_secondary: null
                           })} className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Nuevo Plato
                        </button>
                    )}
                    {activeTab === 'categories' && (
                         <button 
                           onClick={() => setEditingCategory({ 
                             name_es: '', 
                             order: currentCategories.length, 
                             section: selectedSection,
                             name_ca: '', name_en: '', name_de: '', name_fr: '', name_it: '', name_pt: ''
                           })} 
                           className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl"
                         >
                             <Plus className="w-4 h-4" /> Nueva Cat.
                         </button>
                    )}
                </div>
           </div>

           {/* --- TAB CONTENT AREA --- */}

           {activeTab === 'products' && (
             <div className="space-y-6">
                {/* CATEGORY FILTERS WITHIN TAB */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                    <button onClick={() => setSelectedCategory(null)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${!selectedCategory ? 'bg-white text-black border-white' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>TODAS</button>
                    {currentCategories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat.id ? 'bg-white text-black border-white' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>{cat.name_es}</button>
                    ))}
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                                    <th className="px-10 py-6">PRODUCTO / IDENTIFICADOR</th>
                                    <th className="px-10 py-6 text-center">CATEGORÍA</th>
                                    <th className="px-10 py-6 text-center">PRECIO</th>
                                    <th className="px-10 py-6 text-center">ESTADO</th>
                                    <th className="px-10 py-6 text-right">ACCIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {currentProducts.map(p => (
                                    <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                                                    <img src={p.image_url || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-tight">{p.name_es}</p>
                                                    <p className="text-[10px] text-zinc-600 font-mono mt-1 opacity-60">ID: {p.product_code || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                                {p.categories?.name_es}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <span className="text-lg font-black italic tracking-tighter">{p.price_main}€</span>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            {p.is_visible ? (
                                                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">EN CARTA</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 border border-red-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">OCULTO</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button 
                                              onClick={async () => {
                                                setEditingProduct(p);
                                                const { data: relAl } = await supabase.from('producto_alergenos').select('alergeno_id').eq('producto_id', p.id);
                                                if (relAl) setProductAllergens(relAl.map(r => r.alergeno_id));
                                              }} 
                                              className="p-3 bg-zinc-900 rounded-2xl border border-white/10 hover:bg-white hover:text-black transition-all shadow-xl active:scale-90"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'categories' && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[500px]">
                        <thead>
                            <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                <th className="px-8 py-5">Nombre de Categoría</th>
                                <th className="px-8 py-5 text-center">Sección</th>
                                <th className="px-8 py-5 text-center">Orden</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {currentCategories.map(cat => (
                                <tr key={cat.id} className="group hover:bg-white/[0.01]">
                                    <td className="px-8 py-5 text-sm font-black uppercase italic tracking-tighter">{cat.name_es}</td>
                                    <td className="px-8 py-5 text-center text-[10px] font-black uppercase text-zinc-500" style={{ color: primaryColor }}>{cat.section}</td>
                                    <td className="px-8 py-5 text-center font-mono text-xs">{cat.order}</td>
                                    <td className="px-8 py-5 text-right space-x-2">
                                        <button onClick={() => setEditingCategory(cat)} className="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => deleteCategory(cat.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
           )}

            {activeTab === 'hours' && restaurant && (
               <div className="max-w-4xl mx-auto space-y-12 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   {/* SAVE BAR */}
                   <div className="sticky top-20 z-40 bg-zinc-900 border border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between shadow-2xl backdrop-blur-xl">
                       <div>
                           <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Horarios de Servicio</h3>
                           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Configura los turnos de apertura independientes</p>
                       </div>
                       <button 
                         onClick={updateSettings as any}
                         disabled={isSaving} 
                         className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                       >
                           {isSaving ? 'Guardando...' : 'Guardar Horarios'}
                       </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {(restaurant.working_hours || defaultHours).map((h, i) => (
                           <div key={i} className={`bg-zinc-900/40 border rounded-[2rem] p-6 transition-all duration-500 ${h.closed ? 'border-red-500/20 opacity-60 bg-red-500/5' : 'border-white/5 shadow-2xl hover:border-white/10'}`}>
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                   <div className="flex items-center gap-3">
                                       <div className={`p-2.5 rounded-lg border transition-colors ${h.closed ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/10 text-zinc-500'}`}>
                                           <Clock className="w-4 h-4" />
                                       </div>
                                       <h3 className={`text-base font-black uppercase tracking-widest ${h.closed ? 'text-zinc-500' : 'text-white'}`}>{h.day}</h3>
                                   </div>
                                   <button 
                                     type="button" 
                                     onClick={() => {
                                       const newHours = [...(restaurant.working_hours || defaultHours)];
                                       newHours[i].closed = !newHours[i].closed;
                                       setRestaurant({...restaurant, working_hours: newHours});
                                     }}
                                     className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${h.closed ? 'bg-zinc-800 text-zinc-500' : 'bg-green-600 text-black'}`}
                                   >
                                       {h.closed ? 'CERRADO' : 'ABIERTO'}
                                   </button>
                               </div>

                               {!h.closed && (
                                   <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                       {/* TURNO 1 */}
                                       <div className="space-y-3">
                                           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Turno Mañana/Mediodía</span>
                                           <div className="grid grid-cols-2 gap-3">
                                               <div className="bg-black/60 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                                                   <span className="text-[8px] font-black uppercase text-zinc-700 tracking-tighter">Apertura</span>
                                                   <input type="time" value={h.open1 || ''} onChange={e => {
                                                       const newHours = [...(restaurant.working_hours || defaultHours)];
                                                       newHours[i].open1 = e.target.value;
                                                       setRestaurant({...restaurant, working_hours: newHours});
                                                   }} className="bg-transparent w-full text-base text-white font-black outline-none [color-scheme:dark]" />
                                               </div>
                                               <div className="bg-black/60 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                                                   <span className="text-[8px] font-black uppercase text-zinc-700 tracking-tighter">Cierre</span>
                                                   <input type="time" value={h.close1 || ''} onChange={e => {
                                                       const newHours = [...(restaurant.working_hours || defaultHours)];
                                                       newHours[i].close1 = e.target.value;
                                                       setRestaurant({...restaurant, working_hours: newHours});
                                                   }} className="bg-transparent w-full text-base text-white font-black outline-none [color-scheme:dark]" />
                                               </div>
                                           </div>
                                       </div>

                                       {/* TURNO 2 */}
                                       <div className="space-y-3 pt-3 border-t border-white/5">
                                           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Turno Tarde/Noche</span>
                                           <div className="grid grid-cols-2 gap-3">
                                               <div className="bg-black/60 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
                                                   <span className="text-[8px] font-black uppercase text-zinc-700 tracking-tighter">Apertura</span>
                                                   <input type="time" value={h.open2 || ''} onChange={e => {
                                                       const newHours = [...(restaurant.working_hours || defaultHours)];
                                                       newHours[i].open2 = e.target.value;
                                                       setRestaurant({...restaurant, working_hours: newHours});
                                                   }} className="bg-transparent w-full text-base text-white font-black outline-none [color-scheme:dark]" />
                                               </div>
                                               <div className="bg-black/60 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                                                   <span className="text-[8px] font-black uppercase text-zinc-700 tracking-tighter">Cierre</span>
                                                   <input type="time" value={h.close2 || ''} onChange={e => {
                                                       const newHours = [...(restaurant.working_hours || defaultHours)];
                                                       newHours[i].close2 = e.target.value;
                                                       setRestaurant({...restaurant, working_hours: newHours});
                                                   }} className="bg-transparent w-full text-base text-white font-black outline-none [color-scheme:dark]" />
                                               </div>
                                           </div>
                                       </div>
                                   </div>
                               )}
                           </div>
                       ))}
                   </div>
               </div>
            )}

           {activeTab === 'settings' && restaurant && (
              <form onSubmit={updateSettings} className="max-w-2xl mx-auto space-y-12 pb-40">
                  {/* SAVE BAR */}
                  <div className="sticky top-20 z-40 bg-zinc-900 border border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between shadow-2xl backdrop-blur-xl">
                      <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Gestión de Marca</h3>
                          <p className="text-[10px] font-bold text-zinc-500">Configura el estilo y contacto de tu local</p>
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
                      >
                          {isSaving ? 'Guardando...' : 'Guardar Todo'}
                      </button>
                  </div>

                  {/* SECCIÓN 1: ESTILO VISUAL (LOGOTIPO Y COLOR) */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-10">
                      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                         <Palette className="w-5 h-5 text-zinc-500" />
                         <h3 className="text-lg font-black uppercase italic tracking-tighter">Personalización Visual</h3>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-10">
                          <div className="w-40 h-40 bg-black rounded-[2.5rem] border-2 border-dashed border-white/10 relative overflow-hidden group flex-shrink-0">
                              {restaurant.logo_url ? (
                                  <img src={restaurant.logo_url} className="w-full h-full object-contain p-4" />
                              ) : (
                                  <ImageIcon className="w-10 h-10 text-zinc-800" />
                              )}
                              <label className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                                  <Upload className="w-8 h-8" />
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleBrandingUpload(e.target.files[0], 'logo')} />
                              </label>
                          </div>
                          
                          <div className="flex-1 space-y-6">
                              <label className="block">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-4">Color Principal de la Web</span>
                                  <div className="flex items-center gap-4">
                                      <input 
                                        type="color" 
                                        value={restaurant.primary_color || '#D4AF37'} 
                                        onChange={(e) => setRestaurant({...restaurant, primary_color: e.target.value})}
                                        className="h-16 w-32 bg-zinc-800 rounded-2xl border-none cursor-pointer p-1"
                                      />
                                      <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-2xl font-mono text-sm uppercase font-bold text-zinc-400">
                                         {restaurant.primary_color}
                                      </div>
                                  </div>
                              </label>
                          </div>
                      </div>

                      {/* GALERÍA HERO (PORTADAS) */}
                      <div className="space-y-8 pt-6 pb-12">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
                              <div>
                                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#D4AF37]">Galería Principal</h3>
                                  <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase italic tracking-tighter">Gestiona las portadas móviles</p>
                              </div>
                              <span className="text-[10px] bg-white/5 border border-white/10 px-4 py-2 rounded-2xl font-black text-zinc-500 uppercase">
                                  {restaurant.hero_images?.length || 0} / 6 fotos
                              </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-1">
                              {(restaurant.hero_images || []).map((img, i) => (
                                  <div key={i} className="relative aspect-[4/3] bg-zinc-950 rounded-[1.5rem] overflow-hidden border border-white/10 group shadow-2xl">
                                      <img 
                                        src={img} 
                                        alt={`Portada ${i+1}`}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1080x1440/111111/999999?text=IMAGEN+VERTICAL';
                                        }}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-1000" 
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                      
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          if (window.confirm('⚠️ ¿DESEAS ELIMINAR ESTA FOTO?')) {
                                            const news = [...(restaurant.hero_images || [])];
                                            news.splice(i, 1);
                                            setRestaurant({...restaurant, hero_images: news});
                                          }
                                        }} 
                                        className="absolute top-6 right-6 p-4 bg-red-600 text-white rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                      >
                                        <X className="w-6 h-6 stroke-[2.5px]" />
                                      </button>
                                      
                                      <div className="absolute bottom-6 left-8">
                                         <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#D4AF37]">POSICIÓN {i+1}</p>
                                      </div>
                                  </div>
                              ))}

                              {/* BOTÓN SUBIR (CENTRADÍSIMO Y MINIMALISTA) */}
                              <label className="aspect-[4/3] border border-dashed border-white/5 rounded-[1.5rem] bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.04] hover:border-[#D4AF37]/30 transition-all group overflow-hidden text-center">
                                  <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                      <Plus className="w-5 h-5 text-[#D4AF37]" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-200 transition-colors block w-full px-4 leading-relaxed">
                                      Añadir Portada
                                  </span>
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBrandingUpload(file, 'hero').catch(err => alert(`Error: ${err.message}`));
                                    }} 
                                  />
                              </label>
                          </div>
                      </div>
                  </div>

                  {/* SECCIÓN 2: DATOS DE CONTACTO (ESTILO INFO) */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-4 px-2">
                         <Mail className="w-4 h-4 text-zinc-600" />
                         <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Tarjetas de Contacto</h3>
                      </div>

                      {/* DIRECCIÓN */}
                      <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
                          <div className="flex items-center gap-4 mb-6">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                                  <MapPin className="w-6 h-6" />
                              </div>
                              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Dirección</h3>
                          </div>
                          <textarea 
                             value={restaurant.address || ''} 
                             onChange={(e) => setRestaurant({...restaurant, address: e.target.value})}
                             placeholder="Escribe la dirección física aquí..."
                             className="w-full bg-transparent text-lg font-bold leading-snug outline-none resize-none min-h-[60px] placeholder:text-zinc-800"
                          />
                          <div className="mt-4 pt-4 border-t border-white/5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Link Google Maps (Botón Cómo llegar)</span>
                              <input 
                                 type="text"
                                 value={restaurant.google_maps_url || ''}
                                 onChange={(e) => setRestaurant({...restaurant, google_maps_url: e.target.value})}
                                 placeholder="https://goo.gl/maps/..."
                                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-zinc-500 outline-none"
                              />
                          </div>
                      </div>

                      {/* TELÉFONO */}
                      <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
                          <div className="flex items-center gap-4">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                                  <Phone className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                 <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Teléfono</h3>
                                 <input 
                                    type="text"
                                    value={restaurant.phone || ''}
                                    onChange={(e) => setRestaurant({...restaurant, phone: e.target.value})}
                                    placeholder="+34..."
                                    className="w-full bg-transparent text-xl font-black mt-1 outline-none"
                                 />
                              </div>
                          </div>
                      </div>

                      {/* EMAIL */}
                      <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
                          <div className="flex items-center gap-4">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                                  <Mail className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                 <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Email</h3>
                                 <input 
                                    type="email"
                                    value={restaurant.email || ''}
                                    onChange={(e) => setRestaurant({...restaurant, email: e.target.value})}
                                    placeholder="contacto@ejemplo.com"
                                    className="w-full bg-transparent text-lg font-bold mt-1 outline-none"
                                 />
                              </div>
                          </div>
                      </div>

                      {/* SOCIALS */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center gap-4">
                              <Instagram className="w-8 h-8" style={{ color: primaryColor }} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Instagram</span>
                              <input 
                                 type="text"
                                 value={restaurant.instagram_username || ''}
                                 onChange={(e) => setRestaurant({...restaurant, instagram_username: e.target.value})}
                                 placeholder="usuario_ig"
                                 className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[11px] font-bold text-center outline-none"
                              />
                          </div>
                          <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center gap-4">
                              <Facebook className="w-8 h-8" style={{ color: primaryColor }} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Facebook</span>
                              <input 
                                 type="text"
                                 value={restaurant.facebook_url || ''}
                                 onChange={(e) => setRestaurant({...restaurant, facebook_url: e.target.value})}
                                 placeholder="link_facebook"
                                 className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[11px] font-bold text-center outline-none"
                              />
                          </div>
                      </div>
                  </div>
              </form>
           )}

           {activeTab === 'push' && (
              <div className="max-w-xl mx-auto py-12">
                  <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 font-sans">
                      <div className="flex items-center gap-6 mb-10">
                          <Bell className="w-10 h-10 text-white" />
                          <h3 className="text-2xl font-black uppercase italic italic tracking-tighter">Notificación Push</h3>
                      </div>

                      <form onSubmit={async (e) => {
                          e.preventDefault();
                          setPushSending(true);
                          try {
                              const response = await fetch('/api/push', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ...pushData, restaurant_id: restaurant?.id }),
                              });
                              const result = await response.json();
                              if (result.success) {
                                  alert('¡Mensaje enviado!');
                                  setPushData({ title: '', body: '', url: '' });
                              } else throw new Error(result.error);
                          } catch (err: any) { alert(`Error: ${err.message}`); }
                          finally { setPushSending(false); }
                      }} className="space-y-6">
                          <label className="block">
                              <span className="text-[10px] font-black uppercase text-zinc-500 block mb-2">Título</span>
                              <input type="text" required value={pushData.title} onChange={e => setPushData({...pushData, title: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold" />
                          </label>
                          <label className="block">
                              <span className="text-[10px] font-black uppercase text-zinc-500 block mb-2">Mensaje</span>
                              <textarea required value={pushData.body} onChange={e => setPushData({...pushData, body: e.target.value})} className="w-full h-32 bg-black/50 border border-white/10 rounded-xl px-5 py-4 text-sm resize-none" />
                          </label>
                          <button type="submit" disabled={pushSending} className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl">
                              {pushSending ? 'PROCESANDO...' : 'LANZAR BROADCAST'}
                          </button>
                      </form>
                  </div>
              </div>
           )}
      </main>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingProduct(null)} className="absolute inset-0 bg-black/95 backdrop-blur-sm"></motion.div>
             <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-[#121212] border border-white/5 p-10 rounded-[3rem] overflow-y-auto max-h-[90vh] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] custom-scrollbar">
                
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">Editar <span className="text-[#D4AF37]">{editingProduct.name_es || 'Nuevo Producto'}</span></h2>
                    <button onClick={() => setEditingProduct(null)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><X className="w-8 h-8" /></button>
                </div>

                <form onSubmit={handleProductUpdate} className="space-y-12">
                    {/* SECCIÓN 1: IMAGEN */}
                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 block ml-1">IMAGEN DEL PRODUCTO</span>
                        <div className="w-full aspect-[2/1] sm:aspect-[3/1] bg-black/40 rounded-[2.5rem] border-2 border-dashed border-white/5 relative overflow-hidden group flex items-center justify-center">
                           {editingProduct.image_url ? (
                               <img src={editingProduct.image_url} className="w-full h-full object-contain p-4" />
                           ) : (
                               <div className="flex flex-col items-center gap-3">
                                   <ImageIcon className="w-10 h-10 text-zinc-800" />
                                   <span className="text-[10px] font-bold text-zinc-700">SIN IMAGEN</span>
                               </div>
                           )}
                           <label className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-500">
                               <Upload className="w-10 h-10 mb-2" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Subir Nueva Foto</span>
                               <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, editingProduct.product_code || 'new', editingProduct.id)} />
                           </label>
                        </div>
                    </div>

                    {/* SECCIÓN 2: TRADUCCIONES */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                           <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-600">TRADUCCIONES</span>
                           <button 
                             type="button"
                             onClick={translateAI}
                             disabled={loadingTranslations}
                             className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                           >
                               {loadingTranslations ? (
                                   <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                               ) : <Sparkles className="w-3.5 h-3.5" />}
                               TRADUCIR CON AI
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {[
                                { code: 'es', label: 'ES' }, { code: 'ca', label: 'CA' },
                                { code: 'en', label: 'EN' }, { code: 'de', label: 'DE' },
                                { code: 'fr', label: 'FR' }, { code: 'it', label: 'IT' },
                                { code: 'pt', label: 'PT' }
                            ].map(l => (
                                <div key={l.code} className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-xs font-black text-zinc-400">{l.label}</span>
                                        <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">NOMBRE Y DESCRIPCIÓN</span>
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder={`Nombre (${l.label})`}
                                      value={editingProduct[`name_${l.code}`] || ''} 
                                      onChange={e => setEditingProduct({...editingProduct, [`name_${l.code}`]: e.target.value})} 
                                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black focus:border-[#D4AF37]/50 outline-none transition-all" 
                                    />
                                    <textarea 
                                      placeholder={`Descripción (${l.label})`}
                                      value={editingProduct[`desc_${l.code}`] || ''} 
                                      onChange={e => setEditingProduct({...editingProduct, [`desc_${l.code}`]: e.target.value})} 
                                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm h-28 resize-none focus:border-[#D4AF37]/50 outline-none transition-all italic font-medium" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECCIÓN 3: ALÉRGENOS */}
                    <div className="space-y-6 pt-10 border-t border-white/5">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-600 block">INFORMACIÓN ALIMENTARIA (ALÉRGENOS)</span>
                        {allAllergens.length > 0 ? (
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
                                {allAllergens.map(al => {
                                    const isSelected = productAllergens.includes(al.id);
                                    return (
                                        <button 
                                          key={al.id}
                                          type="button"
                                          onClick={() => {
                                              if (isSelected) setProductAllergens(productAllergens.filter(id => id !== al.id));
                                              else setProductAllergens([...productAllergens, al.id]);
                                          }}
                                          className={`relative aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group ${isSelected ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                        >
                                            <img src={al.icono_url} className={`w-8 h-8 object-contain transition-all ${isSelected ? 'opacity-100' : 'opacity-20 group-hover:opacity-40'}`} />
                                            <span className={`text-[7px] font-black uppercase text-center px-1 leading-tight ${isSelected ? 'text-[#D4AF37]' : 'text-zinc-700'}`}>{al.nombre_es}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-6 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500/60 text-xs italic font-bold">
                               <AlertCircle className="w-4 h-4" /> Tabla de alérgenos vacía o no ejecutada en Supabase.
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN 4: PRECIOS Y ESTADO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-6">
                            <label className="col-span-1">
                                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-4">CÓDIGO ESTÁNDAR</span>
                                <input type="text" value={editingProduct.product_code || ''} onChange={e => setEditingProduct({...editingProduct, product_code: e.target.value})} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest focus:border-[#D4AF37]/50 outline-none" />
                            </label>
                            <label className="col-span-1">
                                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-4">POSICIÓN / ORDEN</span>
                                <input type="number" value={editingProduct.order || 0} onChange={e => setEditingProduct({...editingProduct, order: parseInt(e.target.value)})} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-center focus:border-[#D4AF37]/50 outline-none" />
                            </label>
                            <label>
                                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-4">PRECIO PRINCIPAL (€)</span>
                                <input type="number" step="0.01" value={editingProduct.price_main || 0} onChange={e => setEditingProduct({...editingProduct, price_main: parseFloat(e.target.value)})} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-[#D4AF37] focus:border-[#D4AF37] outline-none" />
                            </label>
                            <label>
                                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-4">PRECIO COPA (€)</span>
                                <input type="number" step="0.01" value={editingProduct.price_secondary || ''} onChange={e => setEditingProduct({...editingProduct, price_secondary: e.target.value ? parseFloat(e.target.value) : null})} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black focus:border-[#D4AF37] outline-none" />
                            </label>
                        </div>

                        <div className="space-y-4">
                            <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block ml-1">ESTADO PÚBLICO</span>
                            <button 
                                type="button" 
                                onClick={() => setEditingProduct({...editingProduct, is_visible: !editingProduct.is_visible})}
                                className={`w-full h-[140px] rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all border-2 group ${editingProduct.is_visible ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                            >
                                {editingProduct.is_visible ? (
                                    <>
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-110 transition-transform">
                                            <Utensils className="w-6 h-6 text-black" />
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-[0.2em]">PUBLICADO</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] group-hover:scale-110 transition-transform">
                                            <X className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-[0.2em]">NO PUBLICADO</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-white/5">
                        <button 
                          type="button" 
                          onClick={() => setEditingProduct(null)} 
                          className="flex-1 py-6 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white/10 transition-all"
                        >
                            DESCARTAR
                        </button>
                        <button 
                          type="submit" 
                          disabled={isSaving} 
                          className="flex-[2] py-6 bg-[#D4AF37] text-black font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                        </button>
                    </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCategory && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCategory(null)} className="absolute inset-0 bg-black/95 backdrop-blur-sm"></motion.div>
                <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-3xl bg-[#121212] border border-white/5 rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[90vh] custom-scrollbar">
                    
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Gestionar <span className="text-[#D4AF37]">Categoría</span></h2>
                        <button onClick={() => setEditingCategory(null)} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-90"><X className="w-8 h-8" /></button>
                    </div>

                    <form onSubmit={handleCategoryUpdate} className="space-y-10">
                        {/* SECCIÓN 1: CONFIGURACIÓN BÁSICA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase text-zinc-600 block mb-3 ml-1 tracking-widest">SECCIÓN DEL MENÚ</span>
                                <div className="relative">
                                    <select 
                                      value={editingCategory.section} 
                                      onChange={e => setEditingCategory({...editingCategory, section: e.target.value})} 
                                      className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest appearance-none focus:border-[#D4AF37]/50 outline-none"
                                    >
                                        {['comida', 'bebida', 'postre', 'vinos'].map(s => <option key={s} value={s} className="bg-black">{s.toUpperCase()}</option>)}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                        <ChevronRight className="w-4 h-4 rotate-90" />
                                    </div>
                                </div>
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase text-zinc-600 block mb-3 ml-1 tracking-widest">ORDEN DE APARICIÓN</span>
                                <input 
                                  type="number" 
                                  required 
                                  value={editingCategory.order} 
                                  onChange={e => setEditingCategory({...editingCategory, order: parseInt(e.target.value)})} 
                                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-center focus:border-[#D4AF37]/50 outline-none" 
                                />
                            </label>
                        </div>

                        {/* SECCIÓN 2: IDIOMAS Y TRADUCCIÓN */}
                        <div className="space-y-8">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                               <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-600">NOMBRES EN IDIOMAS</span>
                               <button 
                                 type="button"
                                 onClick={translateCategoryAI}
                                 disabled={loadingTranslations}
                                 className="flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                               >
                                   {loadingTranslations ? (
                                       <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                   ) : <Sparkles className="w-3.5 h-3.5" />}
                                   TRADUCIR CON AI
                               </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { code: 'es', label: 'ESPAÑOL' }, { code: 'ca', label: 'CATALÀ' },
                                    { code: 'en', label: 'ENGLISH' }, { code: 'de', label: 'DEUTSCH' },
                                    { code: 'fr', label: 'FRANÇAIS' }, { code: 'it', label: 'ITALIANO' },
                                    { code: 'pt', label: 'PORTUGUÊS' }
                                ].map(l => (
                                    <label key={l.code} className="space-y-2">
                                        <span className="text-[9px] font-black text-zinc-500 tracking-widest ml-1">{l.label}</span>
                                        <input 
                                          type="text" 
                                          required={l.code === 'es'}
                                          placeholder={`Nombre en ${l.label.toLowerCase()}`}
                                          value={editingCategory[`name_${l.code}`] || ''} 
                                          onChange={e => setEditingCategory({...editingCategory, [`name_${l.code}`]: e.target.value})} 
                                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black focus:border-[#D4AF37]/50 outline-none transition-all uppercase tracking-tight" 
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* BOTONES DE ACCIÓN */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-white/5">
                            <button 
                              type="button" 
                              onClick={() => setEditingCategory(null)} 
                              className="flex-1 py-6 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white/10 transition-all"
                            >
                                CANCELAR
                            </button>
                            <button 
                              type="submit" 
                              disabled={isSaving} 
                              className="flex-[2] py-6 bg-white text-black font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <Save className="w-5 h-5" />
                                {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
