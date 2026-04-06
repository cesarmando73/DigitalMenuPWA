'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Phone, Mail, Clock, Instagram, Facebook, ExternalLink, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { translations } from '@/lib/translations';
import { subscribeToPush, getSubscriptionStatus } from '@/lib/push-notifications';

export default function InfoPage() {
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [pushStatus, setPushStatus] = useState<'prompt' | 'subscribed' | 'denied' | 'unsupported' | 'loading'>('loading');

  useEffect(() => {
    const savedLang = localStorage.getItem('cas-padri-lang');
    if (savedLang) setLang(savedLang);
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const status = await getSubscriptionStatus();
    setPushStatus(status);
  };

  const handleSubscribe = async () => {
    setPushStatus('loading');
    const result = await subscribeToPush(supabase);
    if (result.success) {
      setPushStatus('subscribed');
    } else {
      checkStatus();
    }
  };

  const t = translations[lang] || translations['es'];

  return (
    <main className="min-h-screen bg-black text-white font-jakarta pb-12 overflow-x-hidden">
      {/* Dynamic Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full border border-white/10 bg-white/5 active:scale-90 transition-transform mr-4"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <div className="flex flex-col flex-1 items-center pr-10">
          <div className="cas-padri-logo text-3xl">
            Cas Padrí
            <span className="cas-padri-year">1965</span>
          </div>
        </div>
      </header>

      <div className="px-6 mt-8 space-y-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 text-center"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Mallorca • Est. 1965</span>
          <h1 className="text-4xl font-black tracking-tighter italic">{t['contact']}</h1>
          <div className="h-[1px] w-12 bg-primary/40 mx-auto mt-4" />
        </motion.div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-6 pt-4">
          
          {/* Address */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="group bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-black text-[12px] uppercase tracking-widest text-zinc-400">{t['address']}</h3>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-90 pl-1">
              Carrer Marina, 20,<br />
              07458 Can Picafort, Illes Balears
            </p>
            <a 
              href="http://maps.google.com/maps?saddr=current+location&daddr=Carrer+Marina%2C+20+07458+Can+Picafort%2C+Illes+Balears"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary pt-2 group-hover:translate-x-1 transition-transform"
            >
              <ExternalLink className="w-3.5 h-3.5" /> {t['how_to_get']}
            </a>
          </motion.div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 gap-6">
            <motion.a 
              href="tel:+34971850177"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="group bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-4 active:scale-95 transition-all"
            >
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-zinc-400">{t['phone']}</h3>
                <p className="text-lg font-black group-hover:text-primary transition-colors">+34 971 85 01 77</p>
              </div>
            </motion.a>

            <motion.a 
              href="mailto:reservas@caspadri.com"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="group bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-4 active:scale-95 transition-all"
            >
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-zinc-400">{t['email']}</h3>
                <p className="text-sm font-black group-hover:text-primary transition-colors">reservas@caspadri.com</p>
              </div>
            </motion.a>
          </div>

          {/* Schedule */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-black text-[12px] uppercase tracking-widest text-zinc-400">{t['schedule']}</h3>
            </div>
            
            <div className="space-y-3 px-1">
              {[
                { days: t['mon_tue'], hours: '11:00 — 23:00' },
                { days: t['wed'], hours: t['closed'], special: true },
                { days: t['thu_sun'], hours: '11:00 — 23:00' }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-[11px] font-black uppercase tracking-tight text-zinc-500">{item.days}</span>
                  <span className={`text-xs font-bold ${item.special ? 'text-red-500/80 uppercase tracking-widest text-[9px]' : 'text-zinc-200'}`}>{item.hours}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Social Media */}
          <div className="flex gap-4">
            <motion.a 
              href="https://www.instagram.com/caspadri1965/"
              target="_blank"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex-1 bg-zinc-900/40 py-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              <Instagram className="w-6 h-6 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Instagram</span>
            </motion.a>
            <motion.a 
              href="https://www.facebook.com/caspadri1965/"
              target="_blank"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex-1 bg-zinc-900/40 py-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              <Facebook className="w-6 h-6 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Facebook</span>
            </motion.a>
          </div>

          {/* Push Notifications Card */}
          {pushStatus !== 'unsupported' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-primary/5 p-6 rounded-[2rem] border border-primary/20 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  {pushStatus === 'subscribed' ? <Bell className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-primary/40" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-[12px] uppercase tracking-widest text-primary">{t['notifications']}</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">{t['push_desc']}</p>
                </div>
              </div>
              
              <button
                onClick={handleSubscribe}
                disabled={pushStatus === 'subscribed' || pushStatus === 'denied' || pushStatus === 'loading'}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${pushStatus === 'subscribed' 
                    ? 'bg-primary/20 text-primary cursor-default' 
                    : pushStatus === 'denied'
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-primary text-black active:scale-95 hover:bg-primary/90'
                  }`}
              >
                {pushStatus === 'loading' ? '...' : 
                 pushStatus === 'subscribed' ? t['push_active'] : 
                 pushStatus === 'denied' ? t['push_denied'] : t['push_btn']}
              </button>
            </motion.div>
          )}

        </div>

        {/* Footer info */}
        <div className="py-12 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-4">Mallorca • S'Illot • 07458</p>
          <div className="flex items-center justify-center gap-4">
             <div className="h-[1px] w-8 bg-white/20" />
             <div className="cas-padri-logo text-lg">Cas Padrí</div>
             <div className="h-[1px] w-8 bg-white/20" />
          </div>
        </div>
      </div>
    </main>
  );
}
