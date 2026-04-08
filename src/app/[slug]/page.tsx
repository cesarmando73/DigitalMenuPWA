'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ArrowRight, Utensils } from 'lucide-react';
import { getRestaurantBySlug, Restaurant } from '@/lib/restaurant';

const languages = [
  { code: 'es', label: 'Castellano', flagUrl: 'https://flagcdn.com/w80/es.png' },
  { code: 'ca', label: 'Català', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Catalonia.svg/120px-Flag_of_Catalonia.svg.png' },
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w80/gb.png' },
  { code: 'de', label: 'Deutsch', flagUrl: 'https://flagcdn.com/w80/de.png' },
  { code: 'fr', label: 'Français', flagUrl: 'https://flagcdn.com/w80/fr.png' },
  { code: 'it', label: 'Italiano', flagUrl: 'https://flagcdn.com/w80/it.png' },
  { code: 'pt', label: 'Português', flagUrl: 'https://flagcdn.com/w80/pt.png' }
];

export default function RestaurantLanding() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    async function loadData() {
      const data = await getRestaurantBySlug(slug);
      
      // Verificar si el servicio está suspendido o vencido
      if (data) {
        const isExpired = data.valid_until && new Date(data.valid_until) < new Date();
        if (data.status === 'suspended' || isExpired) {
          setIsSuspended(true);
        }
      }

      setRestaurant(data);
      setIsLoading(false);

      // Check if language is already selected
      const savedLang = localStorage.getItem(`${slug}-lang`);
      if (savedLang && !isSuspended) {
        // router.push(`/${slug}/menu`);
      }
    }
    if (slug) loadData();
  }, [slug]);

  const selectLanguage = (code: string) => {
    localStorage.setItem(`${slug}-lang`, code);
    router.push(`/${slug}/menu`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Restaurante no encontrado</h1>
          <button onClick={() => router.push('/')} className="text-gold flex items-center gap-2 mx-auto">
            Volver al directorio
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA DE SUSPENSIÓN (MORA)
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center px-6 selection:bg-[#D4AF37]/30">
        <div className="absolute inset-0 z-0">
          <img 
            src={restaurant.hero_images?.[0] || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80'} 
            className="w-full h-full object-cover opacity-20 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-sm text-center bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3.5rem] shadow-2xl"
        >
          <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 mx-auto mb-8">
            <Utensils className="w-10 h-10 text-white/20" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-4">Servicio en Mantenimiento</h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
            Estamos realizando ajustes técnicos para mejorar su experiencia. <br/><br/> Por favor, consulte directamente con el establecimiento.
          </p>
          
          <div className="mt-12 pt-12 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 italic">
              Digital Menu Platform • Security Guard
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const primaryColor = restaurant.primary_color || '#D4AF37';
  const heroImage = restaurant.hero_images?.[0] || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Restaurant background" 
          className="w-full h-full object-cover opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          {restaurant.logo_url ? (
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name} 
              className="h-24 mx-auto object-contain drop-shadow-2xl"
            />
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-4">
                <Utensils className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                {restaurant.name}
              </h1>
            </div>
          )}
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 block mb-2">Bienvenido / Welcome</span>
          <h2 className="text-xl font-bold text-white tracking-wide">Selecciona tu idioma</h2>
        </motion.div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {languages.map((lang, index) => (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectLanguage(lang.code)}
                className="group relative flex items-center gap-3 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-white/40 transition-colors">
                  <img src={lang.flagUrl} alt={lang.label} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/40 mb-0.5">{lang.code}</p>
                  <p className="text-xs font-bold text-white">{lang.label}</p>
                </div>
                <ArrowRight className="absolute right-4 w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" style={{ color: primaryColor }} />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12 text-[9px] font-black uppercase tracking-[0.3em] text-white/20"
        >
            Digital Menu v3.0 • Multi-Tenant Edition
        </motion.div>
      </div>
    </div>
  );
}
