'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { translations } from '@/lib/translations';
import { 
  MapPin, Phone, Mail, Clock, Instagram, Facebook, 
  ChevronLeft, ExternalLink, Bell, Navigation
} from 'lucide-react';
import { getRestaurantBySlug, Restaurant } from '@/lib/restaurant';

export default function InfoPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [lang, setLang] = useState('es');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem(`${slug}-lang`) || localStorage.getItem('cas-padri-lang') || 'es';
    setLang(savedLang);

    async function loadData() {
      const res = await getRestaurantBySlug(slug);
      if (res) setRestaurant(res);
      setLoading(false);
    }
    loadData();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>;
  if (!restaurant) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Restaurante no encontrado</div>;

  const primaryColor = restaurant.primary_color || '#D4AF37';
  const t = translations[lang] || translations.es;

  // Mapa de nombres de días en español (DB) a llaves en translations
  const dayNamesMap: { [key: string]: string } = {
    'Lunes': 'Monday',
    'Martes': 'Tuesday',
    'Miércoles': 'Wednesday',
    'Jueves': 'Thursday',
    'Viernes': 'Friday',
    'Sábado': 'Saturday',
    'Domingo': 'Sunday'
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      {/* HEADER COMPACTO */}
      <header className="p-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-full border border-white/10">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter">{t.more_info}</h1>
      </header>

      <main className="px-6 space-y-4 max-w-md mx-auto">
        
        {/* TARJETA DIRECCIÓN */}
        <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                    <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">{t.address}</h3>
            </div>
            <p className="text-lg font-bold leading-snug mb-6 pr-4">
                {restaurant.address || '-'}
            </p>
            {(restaurant.google_maps_url || restaurant.address) && (
                <a 
                    href={(() => {
                        let destination = restaurant.google_maps_url || restaurant.address || '';
                        
                        // Si es un link largo de Google Maps, extraemos el nombre del sitio
                        if (destination.includes('google.com/maps/place/')) {
                            const parts = destination.split('place/')[1]?.split('/@');
                            if (parts && parts[0]) {
                                destination = decodeURIComponent(parts[0].replace(/\+/g, ' '));
                            }
                        }

                        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
                    })()}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-70"
                    style={{ color: primaryColor }}
                >
                    <Navigation className="w-4 h-4" /> {t.how_to_get}
                </a>
            )}
        </section>

        {/* TARJETA TELÉFONO */}
        <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-1">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                    <Phone className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">{t.phone}</h3>
                   <a href={`tel:${restaurant.phone}`} className="text-xl font-black mt-2 block">{restaurant.phone || '-'}</a>
                </div>
            </div>
        </section>

        {/* TARJETA EMAIL */}
        <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-1">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                    <Mail className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">{t.email}</h3>
                   <a href={`mailto:${restaurant.email}`} className="text-lg font-bold mt-2 block break-all">{restaurant.email || '-'}</a>
                </div>
            </div>
        </section>

        {/* TARJETA HORARIOS */}
        <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5" style={{ color: primaryColor }}>
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">{t.schedule}</h3>
                        {/* ESTADO EN TIEMPO REAL */}
                        <div className="mt-1 flex items-center gap-2">
                             {(() => {
                                if (!restaurant.working_hours || restaurant.working_hours.length === 0) return null;
                                
                                const now = new Date();
                                const currentDay = (now.getDay() + 6) % 7; 
                                const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
                                
                                const todayHours = restaurant.working_hours[currentDay];
                                
                                const isBetween = (time: string, start: string, end: string) => {
                                    if (!start || !end) return false;
                                    return time >= start && time <= end;
                                };

                                if (todayHours.closed) {
                                    const nextDay = restaurant.working_hours[(currentDay + 1) % 7];
                                    return <span className="text-[11px] font-black uppercase text-red-500">{t.closed} • {t.closed_opens_tomorrow} {nextDay.open1}</span>;
                                }

                                const isOpenShift1 = isBetween(currentTime, todayHours.open1, todayHours.close1);
                                const isOpenShift2 = isBetween(currentTime, todayHours.open2, todayHours.close2);

                                if (isOpenShift1) return <span className="text-[11px] font-black uppercase text-green-500">OPEN • {t.open_until} {todayHours.close1}</span>;
                                if (isOpenShift2) return <span className="text-[11px] font-black uppercase text-green-500">OPEN • {t.open_until} {todayHours.close2}</span>;

                                if (todayHours.open2 && currentTime < todayHours.open2) {
                                    return <span className="text-[11px] font-black uppercase text-orange-500">{t.closed} • {t.closed_opens_today} {todayHours.open2}</span>;
                                }

                                const nextDay = restaurant.working_hours[(currentDay + 1) % 7];
                                return <span className="text-[11px] font-black uppercase text-red-500">{t.closed} • {t.closed_opens_tomorrow} {nextDay.open1}</span>;
                             })()}
                        </div>
                    </div>
                </div>
            </div>
            
            <details className="group">
                <summary className="list-none cursor-pointer flex items-center justify-between py-2 px-1 hover:opacity-70 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{t.view_details}</span>
                    <motion.div
                        animate={{ rotate: 0 }}
                        className="group-open:rotate-180 transition-transform"
                    >
                        <ChevronLeft className="w-4 h-4 -rotate-90" />
                    </motion.div>
                </summary>
                
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5 pt-8 pb-4"
                >
                    {(restaurant.working_hours || []).map((h, i) => (
                        <div key={i} className="flex justify-between items-start text-xs font-bold border-b border-white/5 pb-4 last:border-0 last:pb-0">
                            <span className="uppercase text-zinc-500 tracking-widest font-black">
                                {t.days[dayNamesMap[h.day]] || h.day}
                            </span>
                            <div className="text-right">
                                {h.closed ? (
                                    <span className="text-red-500 font-black uppercase">{t.closed}</span>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono tracking-tighter">{h.open1} — {h.close1}</span>
                                        {h.open2 && h.close2 && (
                                            <span className="font-mono tracking-tighter opacity-60 flex items-center gap-2 justify-end">
                                                <span className="text-[10px] font-black italic opacity-40">{t.and_connector}</span> {h.open2} — {h.close2}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </details>
        </section>

        {/* BOTONES SOCIALES */}
        <div className="grid grid-cols-2 gap-4">
            <a 
                href={`https://instagram.com/${restaurant.instagram_username}`} 
                target="_blank" 
                className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all"
            >
                <Instagram className="w-8 h-8" style={{ color: primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Instagram</span>
            </a>
            <a 
                href={restaurant.facebook_url || '#'} 
                target="_blank" 
                className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all"
            >
                <Facebook className="w-8 h-8" style={{ color: primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Facebook</span>
            </a>
        </div>

        {/* NOTIFICACIONES */}
        <section className="bg-zinc-900/40 border border-[#D4AF37]/10 rounded-[2.5rem] p-8 flex items-center gap-6">
            <div className="p-4 bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/10">
                <Bell className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">{t.notifications}</h3>
                <p className="text-[10px] text-zinc-500 font-bold mt-1">{t.push_desc}</p>
            </div>
        </section>

      </main>
    </div>
  );
}
