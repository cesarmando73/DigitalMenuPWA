'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { LogIn, Key, Mail, AlertCircle, Save } from 'lucide-react';
import { getRestaurantBySlug, Restaurant } from '@/lib/restaurant';

export default function AdminLogin() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRestaurant() {
      const data = await getRestaurantBySlug(slug);
      setRestaurant(data);
      setIsLoading(false);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push(`/${slug}/admin`);
      }
    }
    if (slug) loadRestaurant();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError('Credenciales inválidas. Por favor, revisa tus datos.');
      setLoading(false);
    } else if (user) {
      // Verify access to this specific restaurant
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();
      
      console.log("DEBUG: User ID:", user.id);
      console.log("DEBUG: Restaurant ID Target:", restaurant?.id);
      console.log("DEBUG: Profile found:", profile);
      if (profileError) console.log("DEBUG: Profile Error:", profileError);

      if (!profile || profile.restaurant_id !== restaurant?.id) {
         setError(`No tienes permiso (Usuario: ${user.id.substring(0,5)}, Perfil: ${profile?.restaurant_id?.substring(0,5) || 'No hay'}, Restaurante: ${restaurant?.id.substring(0,5)})`);
         await supabase.auth.signOut();
         setLoading(false);
         return;
      } else {
        router.push(`/${slug}/admin`);
      }
    }
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>;
  if (!restaurant) return null;

  const primaryColor = restaurant.primary_color || '#D4AF37';

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-8 overflow-hidden bg-black font-jakarta">
      {/* Premium Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full blur-[120px] animate-pulse opacity-10" style={{ backgroundColor: primaryColor }} />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full blur-[120px] animate-pulse opacity-5" style={{ backgroundColor: primaryColor }} />
      
      {/* Thin Gold Border Animation */}
      <div className="absolute inset-4 border-l border-t border-primary/20 rounded-tl-[3rem] opacity-40" />
      <div className="absolute inset-4 border-r border-b border-primary/20 rounded-br-[3rem] opacity-40" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="z-10 w-full max-w-md space-y-12 text-center"
      >
        {/* Logo Section */}
        <div className="space-y-4">
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt={restaurant.name} className="h-16 mx-auto mb-4" />
          ) : (
            <div className="cas-padri-logo text-6xl">
              {restaurant.name}
              <span className="cas-padri-year">Admin Panel</span>
            </div>
          )}
          <div className="h-[1px] w-24 mx-auto mb-6 opacity-40" style={{ backgroundImage: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }} />
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-black opacity-60">
             Admin Restricted Area
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Correo Electrónico
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-black/60 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:border-primary/50 transition-all font-bold placeholder:font-normal placeholder:opacity-30 outline-none shadow-inner"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                <Key className="w-3 h-3" /> Contraseña
              </label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/60 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:border-primary/50 transition-all font-bold placeholder:font-normal placeholder:opacity-30 outline-none shadow-inner"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all mt-4"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent flex-shrink-0" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> 
                  Entrar al Panel
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-4">
           <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 italic">
             Powered by DigitalMenuPWA
           </span>
        </div>
      </motion.div>
    </main>
  );
}
