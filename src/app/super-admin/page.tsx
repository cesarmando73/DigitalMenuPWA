'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Store, Search, LayoutGrid, List, ChevronRight, 
  Settings, User, PlusCircle, LogOut, Loader2, Database, ShieldCheck,
  Mail, Lock, Phone, Clock, Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRes, setNewRes] = useState({ 
    name: '', 
    slug: '', 
    primary_color: '#D4AF37',
    email: '',
    password: '',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      // Si no hay usuario logueado, al login
      if (!user) {
        router.push('/super-admin/login');
        return;
      }
      loadRestaurants();
    }
    checkAuth();
  }, [router]);

  async function loadRestaurants() {
    const { data: resData } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (resData) setRestaurants(resData);

    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    setTotalProducts(count || 0);

    setLoading(false);
  }

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    // El slug debe ser minúsculas y sin espacios
    const cleanSlug = newRes.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    
    try {
      const response = await fetch('/api/admin/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRes, slug: cleanSlug })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Error al crear el sistema');

      alert('¡Sistema creado con éxito! Restaurante, Usuario y Perfil vinculados.');
      setRestaurants([result.restaurant, ...restaurants]);
      setIsModalOpen(false);
      setNewRes({ name: '', slug: '', primary_color: '#D4AF37', email: '', password: '', phone: '' });
    } catch (error: any) {
      alert(`Error crítico: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#D4AF37]/30">
      
      {/* HEADER TIPO DASHBOARD */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase italic italic tracking-tighter">Super Panel</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Control Maestro de Plataforma</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button onClick={() => setIsModalOpen(true)} className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2">
               <PlusCircle className="w-4 h-4" /> Nuevo Cliente
             </button>
             <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-zinc-500 hover:text-red-500">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-16">
        
        {/* STATS RÁPIDOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            { label: 'Restaurantes Activos', value: restaurants.length, icon: Store, color: '#D4AF37' },
            { label: 'Platos Totales', value: totalProducts, icon: Database, color: '#3b82f6' },
            { label: 'Estado del Servidor', value: 'ONLINE', icon: ShieldCheck, color: '#22c55e' }
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group hover:border-white/10 transition-all">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{stat.label}</p>
                   <p className="text-3xl font-black italic italic tracking-tighter" style={{ color: stat.color }}>{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-zinc-800 transition-transform group-hover:scale-110" />
            </div>
          ))}
        </div>

        {/* LISTA DE RESTAURANTES */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-4 mb-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">Gestión de Clientes</h2>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors" />
                <input type="text" placeholder="Buscar por nombre o slug..." className="bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-bold outline-none focus:border-white/20 w-64" />
              </div>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {restaurants.map((res) => (
                <motion.div 
                  layout 
                  key={res.id} 
                  className="bg-zinc-900 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:bg-zinc-900/60 hover:scale-[1.01] transition-all"
                >
                   <div className="flex items-center gap-8">
                      <div className="w-16 h-16 bg-black rounded-[1.5rem] border border-white/10 flex items-center justify-center relative overflow-hidden">
                         {res.logo_url ? <img src={res.logo_url} className="w-full h-full object-contain p-2" /> : <Store className="w-6 h-6 text-zinc-800" />}
                         <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: res.primary_color }} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black uppercase italic tracking-tighter">{res.name}</h3>
                         <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Slug: {res.slug}</span>
                            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                            <div className="flex items-center gap-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                               <span className={`text-[10px] font-black uppercase ${res.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                                 {res.status === 'active' ? 'Suscripción Activa' : 'Servicio Suspendido'}
                               </span>
                            </div>
                            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                            <div className="flex items-center gap-1.5 text-zinc-500">
                               <Clock className="w-3 h-3" />
                               <span className="text-[9px] font-bold uppercase tracking-tight">
                                  {res.valid_until ? (
                                    Math.ceil((new Date(res.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > 0 
                                    ? `${Math.ceil((new Date(res.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días restantes`
                                    : 'Vencido'
                                  ) : 'Sin fecha'}
                               </span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-4">
                      <button 
                         onClick={async () => {
                           const newStatus = res.status === 'active' ? 'suspended' : 'active';
                           const { error } = await supabase.from('restaurants').update({ status: newStatus }).eq('id', res.id);
                           if (!error) loadRestaurants();
                         }}
                         className={`p-3 rounded-xl border transition-all ${res.status === 'active' ? 'bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/5 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white'}`}
                         title={res.status === 'active' ? 'Suspender Servicio' : 'Activar Servicio'}
                      >
                         <Power className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => router.push(`/${res.slug}/admin`)}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
                      >
                         Panel Admin <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>
      </main>

      {/* MODAL CREAR NUEVO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-xl"></motion.div>
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                <h2 className="text-3xl font-black uppercase italic italic tracking-tighter mb-4 text-center">Nuevo Restaurante</h2>
                <p className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest mb-12">Configuración inicial de la plataforma</p>

                <form onSubmit={createRestaurant} className="space-y-8">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block px-2">Nombre Comercial</span>
                      <input type="text" required placeholder="E.g. CAS PADRI" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-black outline-none focus:border-[#D4AF37]/40" />
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block px-2">Slug Único (Dirección Web)</span>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 font-mono text-sm group-hover:text-[#D4AF37] transition-colors">{`/`}</span>
                        <input type="text" required placeholder="cas-padri" value={newRes.slug} onChange={e => setNewRes({...newRes, slug: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 font-mono font-bold text-sm outline-none focus:border-[#D4AF37]/40" />
                      </div>
                      <p className="text-[9px] text-zinc-700 font-bold uppercase mt-3 px-2 italic italic">Este valor creará automáticamente la dirección del menú y su carpeta de imágenes.</p>
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block px-2">Color de Marca</span>
                      <div className="flex items-center gap-6">
                        <input type="color" value={newRes.primary_color} onChange={e => setNewRes({...newRes, primary_color: e.target.value})} className="h-16 w-32 bg-zinc-900 rounded-2xl border-none cursor-pointer p-1" />
                        <div className="px-6 py-4 bg-black/40 border border-white/10 rounded-2xl font-mono text-sm font-bold uppercase text-zinc-400">{newRes.primary_color}</div>
                      </div>
                    </label>

                    <div className="pt-6 border-t border-white/5 space-y-8">
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block px-2">Email del Gerente (Dueño)</span>
                          <div className="relative group">
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" />
                            <input type="email" required placeholder="gerente@restaurante.com" value={newRes.email} onChange={e => setNewRes({...newRes, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold outline-none focus:border-[#D4AF37]/40" />
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block px-2">Teléfono de Contacto</span>
                          <div className="relative group">
                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" />
                            <input type="tel" required placeholder="+34 600 000 000" value={newRes.phone} onChange={e => setNewRes({...newRes, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 font-bold outline-none focus:border-[#D4AF37]/40" />
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block px-2">Contraseña Temporal</span>
                          <div className="relative group">
                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" />
                            <input type="text" required placeholder="Mínimo 6 caracteres" value={newRes.password} onChange={e => setNewRes({...newRes, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 font-mono font-bold outline-none focus:border-[#D4AF37]/40" />
                          </div>
                          <p className="text-[9px] text-zinc-700 font-bold uppercase mt-3 px-2 italic">Proporciona esta contraseña al dueño para su primer ingreso.</p>
                        </label>
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-4 h-4" /> CREAR SISTEMA COMPLETO</>}
                    </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
