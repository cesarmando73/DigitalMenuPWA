'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { MapPin, ArrowRight, Utensils } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRestaurants() {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');
      
      if (data) setRestaurants(data);
      setLoading(false);
    }
    fetchRestaurants();
  }, []);

  const handleSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center py-20 px-8 overflow-hidden bg-black font-jakarta">
      {/* Premium Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      
      {/* Thin Gold Border Animation */}
      <div className="absolute inset-4 border-l border-t border-primary/20 rounded-tl-[3rem] opacity-40 pointer-events-none" />
      <div className="absolute inset-4 border-r border-b border-primary/20 rounded-br-[3rem] opacity-40 pointer-events-none" />

      <div className="z-10 w-full max-w-4xl space-y-16 text-center">
        {/* Logo Section */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="cas-padri-logo text-6xl sm:text-7xl mb-2">
              Digital Menu
              <span className="cas-padri-year">Global Network</span>
            </div>
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-6" />
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.5em] font-black opacity-40">
              Seleccione un establecimiento • Select a restaurant
            </p>
          </motion.div>
        </div>

        {/* Restaurant Selection Grid */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-20">
               <div className="h-12 w-12 border-4 border-zinc-900 border-t-primary rounded-full animate-spin" />
               <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Cargando destinos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {restaurants.map((rest, index) => (
                <motion.button
                  key={rest.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -5 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  onClick={() => handleSelect(rest.slug)}
                  className="group relative h-48 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 backdrop-blur-xl overflow-hidden text-left p-8 flex flex-col justify-between transition-all hover:bg-zinc-800/60 active:scale-95 shadow-2xl"
                >
                  {/* Dynamic Gradient based on restaurant color */}
                  <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-10 -mt-10 transition-opacity group-hover:opacity-40" style={{ backgroundColor: rest.primary_color || '#D4AF37' }} />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-black rounded-2xl border border-white/10 flex items-center justify-center p-2">
                          {rest.logo_url ? (
                            <img src={rest.logo_url} alt={rest.name} className="w-full h-full object-contain" />
                          ) : (
                            <Utensils className="w-6 h-6 text-zinc-700" />
                          )}
                       </div>
                       <div>
                          <h3 className="font-black text-xl italic tracking-tight">{rest.name}</h3>
                          <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                             <MapPin className="w-2.5 h-2.5" />
                             {rest.address?.split(',').pop().trim() || 'Mallorca'}
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 group-hover:text-primary transition-colors" style={{ '--tw-group-hover-color': rest.primary_color } as any}>
                        Acceder al menú
                     </span>
                     <div className="p-3 bg-white/5 rounded-full border border-white/5 group-hover:bg-primary group-hover:text-black transition-all" style={{ '--tw-group-hover-bg': rest.primary_color } as any}>
                        <ArrowRight className="w-4 h-4" />
                     </div>
                  </div>
                </motion.button>
              ))}
              
              {restaurants.length === 0 && (
                <div className="col-span-full py-20 text-center opacity-30">
                  <p className="text-xs font-black uppercase tracking-widest italic">No hay establecimientos activos.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-20 opacity-20 hover:opacity-100 transition-opacity">
           <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em] flex flex-col items-center justify-center gap-4">
             Digital Menu PWA Platform
             <div className="h-[1px] w-12 bg-zinc-800" />
             © 2026 Admin Network
           </span>
        </div>
      </div>
    </main>
  );
}
