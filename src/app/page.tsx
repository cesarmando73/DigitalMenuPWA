'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { code: 'es', label: 'Español', flagUrl: 'https://flagcdn.com/w80/es.png' },
  { code: 'ca', label: 'Català', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Catalonia.svg/120px-Flag_of_Catalonia.svg.png' },
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w80/gb.png' },
  { code: 'de', label: 'Deutsch', flagUrl: 'https://flagcdn.com/w80/de.png' },
  { code: 'fr', label: 'Français', flagUrl: 'https://flagcdn.com/w80/fr.png' },
  { code: 'it', label: 'Italiano', flagUrl: 'https://flagcdn.com/w80/it.png' },
  { code: 'pt', label: 'Português', flagUrl: 'https://flagcdn.com/w80/pt.png' }
];

export default function Home() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSelect = (code: string) => {
    setIsRedirecting(true);
    localStorage.setItem('cas-padri-lang', code);
    
    // Smooth transition to menu
    setTimeout(() => {
      router.push('/menu');
    }, 400);
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-8 overflow-hidden bg-black font-jakarta">
      {/* Premium Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      
      {/* Thin Gold Border Animation */}
      <div className="absolute inset-4 border-l border-t border-primary/20 rounded-tl-[3rem] opacity-40" />
      <div className="absolute inset-4 border-r border-b border-primary/20 rounded-br-[3rem] opacity-40" />

      <AnimatePresence mode="wait">
        {!isRedirecting ? (
          <motion.div 
            key="content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="z-10 w-full space-y-16 text-center"
          >
            {/* Logo Section */}
            <div className="space-y-4">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex flex-col items-center pt-12 pb-6"
              >
                <div className="cas-padri-logo text-7xl sm:text-8xl mb-2">
                  Cas Padrí
                  <span className="cas-padri-year">1965</span>
                </div>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-6" />
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.5em] font-black opacity-40">
                  Mallorca • S'Illot
                </p>
              </motion.div>
            </div>

            {/* Language Selection Grid */}
            <div className="space-y-8">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest italic opacity-60">
                Seleccione su idioma / Select your language
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                {languages.map((lang, index) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileFocus={{ scale: 1.05 }}
                    transition={{ delay: 0.3 + index * 0.08, duration: 0.6 }}
                    onClick={() => handleSelect(lang.code)}
                    className="group relative flex flex-col items-center justify-center h-32 rounded-[2rem] border border-white/5 bg-gradient-to-b from-zinc-900/50 to-black transition-all hover:border-primary/40 hover:from-zinc-900 hover:to-zinc-900 active:scale-95 shadow-xl"
                  >
                    <div className="w-16 h-10 mb-3 rounded-md overflow-hidden shadow-lg border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <img 
                        src={lang.flagUrl} 
                        alt={lang.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-widest text-zinc-500 group-hover:text-primary transition-colors">{lang.label}</span>
                    
                    {/* Hover Glow */}
                    <div className="absolute inset-0 rounded-[2rem] bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="pt-4">
               <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                 Mallorca <span className="w-1 h-1 bg-zinc-800 rounded-full" /> S'Illot
               </span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black gap-6"
          >
            <div className="relative">
               <div className="h-16 w-16 border-4 border-zinc-900 rounded-full" />
               <div className="absolute inset-0 h-16 w-16 border-t-4 border-primary rounded-full animate-spin" />
            </div>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando Menú...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
