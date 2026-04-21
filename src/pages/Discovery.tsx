import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Filter, Grid, List as ListIcon, Bitcoin, ShoppingCart, Heart } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { CATEGORIES } from '@/src/lib/products';
import type { Product } from '@/src/lib/products';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useProducts, useWishlist, useToggleWishlist, useAddToCart } from '@/src/hooks/queries';

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onNavigate }: { product: Product; onNavigate: (path: string) => void }) {
  const { data: wishlist = [] } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();
  const wishlisted = wishlist.includes(product.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="group cursor-pointer"
      onClick={() => onNavigate('/product/' + product.id)}
    >
      <div className="relative aspect-3/4 rounded-3xl overflow-hidden mb-4 border border-white/10 bg-neutral-800 shadow-xl">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 grayscale-[0.1] group-hover:grayscale-0"
        />

        <div className="absolute top-4 left-4">
          <span className="bg-mezo-ink/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl">
            {product.tag}
          </span>
        </div>

        <button
          onClick={e => { e.stopPropagation(); toggleWishlist.mutate(product.id); }}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
        >
          <Heart size={13} className={cn('transition-colors', wishlisted ? 'text-mezo-rose fill-mezo-rose' : 'text-white/70')} />
        </button>

        {product.colors && product.colors.length > 1 && (
          <div className="absolute bottom-4 left-4">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/50 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              +{product.colors.length} colors
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={e => {
              e.stopPropagation();
              addToCart.mutate({ productId: product.id, quantity: 1 });
              onNavigate('/checkout');
            }}
            className="w-full flex items-center justify-center gap-2 bg-mezo-gold text-white text-[9px] font-black tracking-[0.2em] uppercase py-2.5 rounded-xl hover:bg-white hover:text-mezo-ink transition-colors"
          >
            <ShoppingCart size={11} /> Quick Buy
          </button>
        </div>
      </div>

      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black tracking-[0.2em] uppercase text-mezo-gold">{product.brand}</p>
          <div className="flex items-center gap-1">
            <Bitcoin size={9} className="text-white/20" />
            <p className="text-[10px] font-black text-white/50">{product.musd} MUSD</p>
          </div>
        </div>
        <p className="font-display text-base font-bold italic text-white/90 group-hover:text-white transition-colors leading-tight">
          {product.name}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Discovery() {
  const { navigate } = useAppNavigation();
  const { data: products = [], isLoading } = useProducts();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridView, setGridView] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  const filtered = products
    .filter(p => activeCategory === 'All' || p.category === activeCategory)
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.musd - b.musd;
      if (sortBy === 'price-desc') return b.musd - a.musd;
      return 0;
    });

  return (
    <div className="min-h-screen bg-mezo-ink text-white font-sans selection:bg-mezo-gold/30">
      <header className="px-8 md:px-12 py-8 flex justify-between items-center border-b border-white/5 bg-mezo-ink/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 hover:bg-white/5 rounded-full transition-colors group">
            <ArrowLeft className="text-white/40 group-hover:text-white transition-colors" size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tighter italic">Discovery</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-mezo-gold mt-0.5">
              {isLoading ? '...' : `${filtered.length} items`} · Pay with MUSD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none cursor-pointer"
          >
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
          <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button onClick={() => setGridView(true)} className={cn('p-2 rounded-lg transition-all', gridView ? 'bg-white/10 text-mezo-gold' : 'text-white/30 hover:text-white')}>
              <Grid size={15} />
            </button>
            <button onClick={() => setGridView(false)} className={cn('p-2 rounded-lg transition-all', !gridView ? 'bg-white/10 text-mezo-gold' : 'text-white/30 hover:text-white')}>
              <ListIcon size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="px-8 md:px-12 py-8 space-y-8">
        <div className="relative max-w-lg">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-5 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase whitespace-nowrap transition-all shrink-0',
                activeCategory === cat
                  ? 'bg-mezo-gold text-white shadow-lg shadow-mezo-gold/20'
                  : 'bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/20'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-3/4 rounded-3xl bg-white/5 animate-pulse" />
              ))}
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 space-y-3">
              <Filter size={32} className="mx-auto text-white/10" />
              <p className="text-white/30 font-black uppercase tracking-widest text-sm">No products found</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className={cn('grid gap-6', gridView ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2')}
            >
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} onNavigate={navigate} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
