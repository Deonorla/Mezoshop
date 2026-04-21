import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Bitcoin, ShieldCheck, Zap, ShoppingCart, Heart, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useProduct, useProducts, useWishlist, useToggleWishlist, useAddToCart, useBorrowPosition, useCart } from '@/src/hooks/queries';

export default function ProductDetail() {
  const { navigate } = useAppNavigation();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id) || 1;

  const { data: product, isLoading } = useProduct(productId);
  const { data: allProducts = [] } = useProducts();
  const { data: wishlist = [] } = useWishlist();
  const { data: borrow } = useBorrowPosition();
  const { data: cartItems = [] } = useCart();
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-mezo-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mezo-gold/30 border-t-mezo-gold rounded-full animate-spin" />
      </div>
    );
  }

  const wishlisted = wishlist.includes(product.id);
  const availableMUSD = borrow?.available ?? 0;
  const canAfford = availableMUSD >= product.musd;
  const related = allProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);

  function prevImg() { setActiveImg(i => (i === 0 ? product.images.length - 1 : i - 1)); }
  function nextImg() { setActiveImg(i => (i === product.images.length - 1 ? 0 : i + 1)); }

  return (
    <div className="min-h-screen bg-mezo-ink text-white font-sans selection:bg-mezo-gold/30">

      {/* ── Header ── */}
      <header className="px-8 md:px-12 py-8 flex justify-between items-center border-b border-white/5 bg-mezo-ink/80 backdrop-blur-xl sticky top-0 z-50">
        <button
          onClick={() => navigate('/discovery')}
          className="flex items-center gap-3 text-white/40 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black tracking-[0.3em] uppercase">Back</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
          <Bitcoin size={12} className="text-mezo-gold" />
          <span className="text-[10px] font-black tracking-widest uppercase text-white/60">
            {availableMUSD.toLocaleString()} MUSD available
          </span>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all"
        >
          <ShoppingCart size={14} className="text-mezo-rose" /> Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-mezo-rose text-white text-[9px] font-black flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-8 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* ── Left: Image gallery ── */}
          <div className="space-y-4">
            {/* Main image with prev/next */}
            <div className="relative aspect-3/4 rounded-3xl overflow-hidden border border-white/10 bg-neutral-800 group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  src={product.images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                />
              </AnimatePresence>

              {/* Badges */}
              <div className="absolute top-5 left-5 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-mezo-ink text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={10} className="text-green-600" /> Authenticated
                </div>
                <div className="bg-mezo-gold px-3 py-1.5 rounded-xl text-white text-[8px] font-black uppercase tracking-widest">
                  {product.tag}
                </div>
              </div>

              <button
                onClick={() => toggleWishlist.mutate(product.id)}
                className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <Heart size={16} className={cn('transition-colors', wishlisted ? 'text-mezo-rose fill-mezo-rose' : 'text-white/60')} />
              </button>

              {/* Prev / Next arrows — only if multiple images */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextImg}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
                  >
                    <ChevronRight size={18} />
                  </button>
                  {/* Dot indicators */}
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {product.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={cn(
                          'rounded-full transition-all',
                          i === activeImg ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
              {product.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    'w-20 h-24 rounded-2xl overflow-hidden border-2 shrink-0 transition-all',
                    activeImg === i ? 'border-mezo-gold' : 'border-white/10 opacity-50 hover:opacity-80'
                  )}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: Details ── */}
          <div className="space-y-8 lg:pt-4">

            {/* Brand + name */}
            <div>
              <p className="text-[10px] font-black tracking-[0.4em] uppercase text-mezo-gold mb-2">{product.brand}</p>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter italic text-white leading-tight mb-3">
                {product.name}
              </h1>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30">
                {product.category} · MZ-{String(product.id).padStart(3, '0')}
              </p>
            </div>

            {/* Price card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-1">Price</p>
                  <p className="font-display text-4xl font-black text-white tracking-tighter">
                    {product.musd.toLocaleString()}
                  </p>
                  <p className="text-mezo-gold font-black text-sm mt-0.5">MUSD</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black tracking-widest uppercase text-white/30 mb-1">Your BTC covers</p>
                  <p className={cn('text-2xl font-black', canAfford ? 'text-green-400' : 'text-red-400')}>
                    {canAfford ? '✓' : '✗'} {availableMUSD.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-white/30 mt-0.5">MUSD available</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/8 flex items-center gap-3">
                <Bitcoin size={14} className="text-mezo-rose shrink-0" />
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Borrow <span className="text-white font-bold">{product.musd.toLocaleString()} MUSD</span> against your BTC. 0% interest. Your BTC stays locked — never sold.
                </p>
              </div>
            </div>

            {/* Color selector */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/50">
                  Color: <span className="text-white">{selectedColor}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                        selectedColor === color
                          ? 'bg-white text-mezo-ink border-white'
                          : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30 hover:text-white'
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/50">Select Size</p>
                  <button className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-mezo-gold hover:text-white transition-colors">
                    Size Guide <ChevronDown size={12} />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        'px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all',
                        selectedSize === size
                          ? 'bg-white text-mezo-ink border-white'
                          : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30 hover:text-white'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  addToCart.mutate(
                    { productId: product.id, quantity: 1, size: selectedSize ?? undefined, color: selectedColor ?? undefined },
                    { onSuccess: () => navigate('/checkout') }
                  );
                }}
                className="w-full flex items-center justify-center gap-3 bg-mezo-gold py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase text-white hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-mezo-gold/20"
              >
                <Bitcoin size={16} /> Borrow MUSD & Buy
              </button>
              <button
                onClick={() => addToCart.mutate({ productId: product.id, quantity: 1, size: selectedSize ?? undefined, color: selectedColor ?? undefined })}
                disabled={addToCart.isPending}
                className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase text-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <ShoppingCart size={16} />
                {addToCart.isPending ? 'Adding...' : addToCart.isSuccess ? '✓ Added to Cart' : 'Add to Cart'}
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <ShieldCheck size={14} className="text-green-400" />, label: 'Authenticated' },
                { icon: <Zap size={14} className="text-mezo-gold" />, label: 'Instant MUSD' },
                { icon: <Bitcoin size={14} className="text-mezo-rose" />, label: '0% Interest' },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-2 bg-white/5 border border-white/8 rounded-2xl py-4">
                  {b.icon}
                  <span className="text-[8px] font-black tracking-widest uppercase text-white/40">{b.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-3 pt-2 border-t border-white/8">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30">About this piece</p>
              <p className="text-sm text-white/50 leading-relaxed">{product.description}</p>
            </div>
          </div>
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <section className="mt-24 space-y-8">
            <div className="flex justify-between items-baseline">
              <h2 className="font-display text-3xl font-black tracking-tighter italic">You May Also Like</h2>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{product.category}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {related.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => navigate('/product/' + item.id)}
                >
                  <div className="relative aspect-3/4 rounded-3xl overflow-hidden mb-4 border border-white/10 bg-neutral-800">
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <p className="text-[9px] font-black tracking-[0.3em] uppercase text-mezo-gold mb-1">{item.brand}</p>
                  <p className="font-display text-lg font-bold italic text-white/90 group-hover:text-white transition-colors">{item.name}</p>
                  <p className="text-sm font-black text-white/50 mt-1">{item.musd.toLocaleString()} MUSD</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
