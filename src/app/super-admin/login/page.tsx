'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciales no válidas.');
      setLoading(false);
    } else {
      router.push('/super-admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-[#D4AF37]/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-950 border border-white/10 rounded-[3rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(212,175,55,0.1)] mb-6">
              <ShieldCheck className="w-10 h-10 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-center">Software Master</h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2 text-center">Acceso Red de Administración</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 block">Email</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tuplataforma.com"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-5 font-bold outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-800" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 block">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-5 font-bold outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-zinc-800" 
                />
              </div>
            </div>

            {error && (
              <p className="text-[10px] font-black uppercase text-red-500 text-center tracking-widest">
                {error}
              </p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-8 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>ENTRAR <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-[9px] font-bold text-zinc-700 uppercase tracking-widest mt-12 italic">
            © 2026 Admin Network • Control de Seguridad
          </p>
        </div>
      </motion.div>
    </div>
  );
}
