import { motion } from 'motion/react';
import { Bitcoin, ArrowRight } from 'lucide-react';
import { PRODUCTS } from '@/src/lib/products';

interface HeroSectionProps {
  onNavigate: (page: string) => void;
}

export default function HeroSection({ onNavigate }: HeroSectionProps) {
  // Featured drop — Women Fashion Coat
  const featured = PRODUCTS.find(p => p.id === 32)!;
  return (
    <section className="relative h-screen overflow-hidden bg-neutral-950">

      {/* ── Main hero image ── */}
      <motion.img
        src="https://images.unsplash.com/photo-1767334010488-83cdb8539273?q=85&w=1740&auto=format&fit=crop"
        alt="Mannequins display clothing in a dimly lit store"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.06, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      />

      {/* ── Gradient overlays ── */}
      {/* Bottom fade to dark */}
      <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/30 to-transparent" />
      {/* Left edge vignette */}
      <div className="absolute inset-0 bg-linear-to-r from-neutral-950/60 via-transparent to-transparent" />
      {/* Subtle top fade */}
      <div className="absolute inset-0 bg-linear-to-b from-neutral-950/40 via-transparent to-transparent" />

      {/* ── Large editorial text — center left ── */}
      <div className="absolute inset-0 flex flex-col justify-center pl-8 md:pl-20 pointer-events-none select-none">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-[10px] font-black tracking-[0.5em] uppercase text-white/40 mb-4"
        >
          Bitcoin Commerce
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-black text-white leading-[0.9] tracking-tighter"
          style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)' }}
        >
          Shop
          <br />
          <span className="text-mezo-gold italic">Without</span>
          <br />
          Selling your   <br />
          <span className="text-mezo-gold italic">btc.</span> 
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="text-sm text-white/40 mt-6 max-w-xs leading-relaxed font-light"
        >
          Borrow MUSD against your BTC.<br />No liquidation. No credit check.
        </motion.p>
      </div>

      {/* ── Hero card — bottom right ── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-16 right-8 md:right-16 w-72"
      >
        {/* Card glow */}
        <div className="absolute -inset-4 bg-mezo-gold/10 blur-2xl rounded-full pointer-events-none" />

        <div className="relative bg-white/8 backdrop-blur-2xl border border-white/15 p-6 rounded-sm shadow-2xl">
          {/* Top label */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[8px] font-black tracking-[0.4em] uppercase text-white/40">Featured Drop</span>
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-mezo-gold bg-mezo-gold/10 px-2 py-1 rounded-full">Live</span>
          </div>

          {/* Product preview */}
          <div className="flex gap-4 mb-5">
            <div className="w-16 h-20 rounded-sm overflow-hidden shrink-0 border border-white/10">
              <img
                src={featured.images[0]}
                alt={featured.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1">{featured.brand}</p>
              <h2 className="font-display text-lg font-black text-white leading-tight mb-2">
                {featured.name}
              </h2>
              <p className="text-base font-black text-mezo-gold">{featured.musd} MUSD</p>
            </div>
          </div>

          {/* Bitcoin badge */}
          <div className="flex items-center gap-2 mb-5 pb-5 border-b border-white/8">
            <Bitcoin size={11} className="text-mezo-rose" />
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/30">
              Borrow {featured.musd} MUSD · No selling
            </span>
          </div>

          <button
            onClick={() => onNavigate(`/product/${featured.id}`)}
            className="flex items-center gap-2 bg-white text-mezo-ink text-[10px] font-black tracking-[0.2em] uppercase px-5 py-3.5 hover:bg-mezo-gold hover:text-white transition-colors w-full justify-center rounded-sm"
          >
            Shop Now <ArrowRight size={12} />
          </button>
        </div>
      </motion.div>

      {/* ── Scroll hint ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[8px] font-black tracking-[0.4em] uppercase text-white/20">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-white/20"
        />
      </motion.div>
    </section>
  );
}
