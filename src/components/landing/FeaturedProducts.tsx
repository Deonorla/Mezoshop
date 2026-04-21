import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PRODUCTS } from '@/src/lib/products';

interface FeaturedProductsProps {
  onNavigate: (page: string) => void;
}

// Pick 4 diverse products: shoe, bag, dress, coat
const FEATURED_IDS = [1, 4, 23, 32]; // Phantom Runner, Structured Hand Bag, Midi Dress, Fashion Coat
const FEATURED = PRODUCTS.filter(p => FEATURED_IDS.includes(p.id));

function ProductCard({ product, index, onNavigate }: {
  product: typeof PRODUCTS[0];
  index: number;
  onNavigate: (page: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  function handleClick() {
    onNavigate(`/product/${product.id}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div className="relative aspect-3/4 overflow-hidden bg-mezo-cream-dark rounded-sm">
        {imgError ? (
          <div className="w-full h-full bg-mezo-ink/5 flex items-center justify-center">
            <span className="font-display text-xs font-black tracking-widest uppercase text-mezo-ink/20">
              {product.brand}
            </span>
          </div>
        ) : (
          <img
            src={product.images[0]}
            alt={product.name}
            onError={() => setImgError(true)}
            className={cn(
              'w-full h-full object-cover transition-transform duration-700',
              hovered && 'scale-105'
            )}
          />
        )}

        <span className="absolute top-3 left-3 bg-mezo-ink text-white text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1">
          {product.tag}
        </span>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 p-3"
            >
              <button
                className="w-full bg-mezo-ink text-white text-[10px] font-bold tracking-[0.2em] uppercase py-2.5 hover:bg-mezo-rose-dark transition-colors"
                onClick={e => { e.stopPropagation(); handleClick(); }}
              >
                View Product
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-3 space-y-0.5">
        <p className="text-[9px] font-semibold tracking-[0.25em] uppercase text-mezo-ink/40 truncate">
          {product.brand} · {product.category}
        </p>
        <p className="font-display text-sm font-semibold text-mezo-ink truncate">
          {product.name}
        </p>
        <p className="text-sm font-bold text-mezo-gold">{product.musd} MUSD</p>
      </div>
    </motion.div>
  );
}

export default function FeaturedProducts({ onNavigate }: FeaturedProductsProps) {
  return (
    <section id="collections" className="bg-mezo-cream-light py-32 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[9px] font-black tracking-[0.4em] uppercase text-mezo-gold mb-2">
              FEATURED DROPS
            </p>
            <h2 className="font-display text-4xl font-black text-mezo-ink">
              New Arrivals
            </h2>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            onClick={() => onNavigate('discovery')}
            className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-mezo-ink/50 hover:text-mezo-ink transition-colors"
          >
            View All <ArrowRight size={12} />
          </motion.button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURED.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </section>
  );
}
