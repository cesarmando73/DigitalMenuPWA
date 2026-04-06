'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { LogIn, Key, Mail, AlertCircle, Save } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError('Credenciales inválidas. Por favor, revisa tus datos.');
      setLoading(false);
    } else {
      // Login exitoso, redirección al panel de administración
      router.push('/admin');
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-8 overflow-hidden bg-black font-jakarta">
      {/* Premium Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      
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
          <div className="cas-padri-logo text-6xl">
            Cas Padrí
            <span className="cas-padri-year">Admin Panel</span>
          </div>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto mb-6" />
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-black opacity-40">
            Mallorca • Acceso Restringido
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
                className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/10 hover:shadow-primary/30 active:scale-95 transition-all mt-4"
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

          {/* Hover Glow */}
          <div className="absolute inset-0 rounded-[2.5rem] bg-primary/5 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Footer */}
        <div className="pt-4">
           <span className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
             Cas Padrí <span className="w-1 h-1 bg-zinc-800 rounded-full" /> Gestión de Contenidos
           </span>
        </div>
      </motion.div>
    </main>
  );
}
