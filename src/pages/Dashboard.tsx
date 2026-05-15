import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Compass, ShoppingBag, User, Plus, MessageSquare, Sparkles, Send, Mic, Image as ImageIcon, Bitcoin, ShoppingCart, Package } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useCart } from '@/src/hooks/queries';
import { useChat, type ChatMessage, type ProductResult } from '@/src/hooks/useChat';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import Logo from '@/src/components/Logo';
import { useWalletBalances } from '@/src/hooks/useWalletBalances';
import { useAuth } from '@/src/hooks/useAuth';
import MarkdownMessage from '@/src/components/MarkdownMessage';
import { backendClient } from '@/src/lib/backendClient';

// ─── Quick Prompts ────────────────────────────────────────────────────────────

export interface QuickPromptContext {
  aesthetic?: string;
  shopFor?: string;
  musdBalance?: string;
}

export function generateQuickPrompts(ctx: QuickPromptContext): [string, string, string, string] {
  const slot0 = ctx.aesthetic ? `Find me ${ctx.aesthetic} pieces` : 'Find me a luxury coat';
  const slot1 = ctx.shopFor ? `Best ${ctx.shopFor} looks this season` : 'Show me designer bags';
  const slot2 = ctx.musdBalance ? `What can I get for ${ctx.musdBalance} MUSD?` : 'Best watches under 15k MUSD';
  const slot3 = 'New runway drops';
  return [slot0, slot1, slot2, slot3];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-2xl bg-mezo-gold flex items-center justify-center text-white shrink-0">
        <Sparkles size={16} />
      </div>
      <div className="flex items-center gap-1.5 bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-mezo-ink/5 shadow-sm">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-mezo-ink/30 inline-block"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

interface InlineProductCardProps {
  product: ProductResult;
  walletAddress: string | undefined;
  onAddToCart: (productId: string, size?: string, color?: string) => Promise<void>;
  onNavigate: (productId: string) => void;
}

function InlineProductCard({ product, onAddToCart, onNavigate }: InlineProductCardProps) {
  const colors = product.colors ?? [];

  // Build a color→imageIndex map by scanning image filenames for color keywords
  // Falls back to even distribution if no filename match found
  function getImageIndexForColor(color: string): number {
    const colorLower = color.toLowerCase().replace(/\s+/g, '_');
    // Try to find an image whose filename contains the color name
    const idx = product.images.findIndex(img => {
      const filename = img.toLowerCase();
      return filename.includes(colorLower) ||
        filename.includes(color.toLowerCase()) ||
        // Handle common color aliases
        (colorLower === 'burgundy' && filename.includes('burgundy')) ||
        (colorLower === 'light_blue' && (filename.includes('light_blue') || filename.includes('lightblue'))) ||
        (colorLower === 'dark_gray' && (filename.includes('dark_gray') || filename.includes('darkgray')));
    });
    if (idx !== -1) return idx;
    // Fallback: even distribution
    const colorIdx = colors.indexOf(color);
    const imagesPerColor = colors.length > 0 ? Math.floor(product.images.length / colors.length) : product.images.length;
    return colorIdx * imagesPerColor;
  }

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length > 0 ? colors[0] : null,
  );
  const [activeImg, setActiveImg] = useState(() =>
    colors.length > 0 ? getImageIndexForColor(colors[0]) : 0
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // How many images belong to the currently selected color
  const imagesPerColor = colors.length > 0 ? Math.floor(product.images.length / colors.length) : product.images.length;
  const currentColorStartIdx = selectedColor ? getImageIndexForColor(selectedColor) : 0;

  function handleColorSelect(color: string) {
    setSelectedColor(color);
    setActiveImg(getImageIndexForColor(color));
  }

  async function handleAddToCart() {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      await onAddToCart(product.id, selectedSize ?? undefined, selectedColor ?? undefined);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  const displayImages = product.images.length > 0 ? product.images : [];
  const currentImage = displayImages[activeImg] ?? displayImages[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-52 shrink-0 bg-white rounded-2xl overflow-hidden border border-mezo-ink/8 shadow-md flex flex-col"
    >
      {/* Image */}
      <div
        className="relative aspect-3/4 overflow-hidden bg-mezo-cream-dark cursor-pointer"
        onClick={() => onNavigate(product.id)}
      >
        <img
          src={currentImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {/* Tag badge */}
        <span className="absolute top-2 left-2 bg-mezo-ink text-white text-[8px] font-black tracking-[0.2em] uppercase px-2 py-1 rounded-sm">
          {product.tag}
        </span>
        {/* Image dots if multiple images for current color */}
        {imagesPerColor > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: Math.min(imagesPerColor, 4) }).map((_, i) => {
              const imgIdx = currentColorStartIdx + i;
              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveImg(imgIdx); }}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    activeImg === imgIdx ? 'bg-white' : 'bg-white/40',
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Brand + Name */}
        <div>
          <p className="text-[8px] font-black tracking-[0.2em] uppercase text-mezo-gold mb-0.5">{product.brand}</p>
          <p
            className="text-[11px] font-black text-mezo-ink leading-tight cursor-pointer hover:text-mezo-gold transition-colors line-clamp-2"
            onClick={() => onNavigate(product.id)}
          >
            {product.name}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-center gap-1">
          <Bitcoin size={9} className="text-mezo-ink/30" />
          <p className="text-[11px] font-black text-mezo-ink">{product.musd} <span className="text-mezo-gold">MUSD</span></p>
        </div>

        {/* Color swatches */}
        {colors.length > 0 && (
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-mezo-ink/40">
              {selectedColor ?? 'Color'}
            </p>
            <div className="flex flex-wrap gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  title={color}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[8px] font-bold border transition-all',
                    selectedColor === color
                      ? 'bg-mezo-ink text-white border-mezo-ink'
                      : 'bg-transparent text-mezo-ink/60 border-mezo-ink/20 hover:border-mezo-ink/60',
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
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-mezo-ink/40">Size</p>
            <div className="flex flex-wrap gap-1">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-[9px] font-black border transition-all',
                    selectedSize === size
                      ? 'bg-mezo-ink text-white border-mezo-ink'
                      : 'bg-transparent text-mezo-ink/60 border-mezo-ink/20 hover:border-mezo-ink/60',
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={status === 'loading'}
          className={cn(
            'mt-auto w-full py-2.5 rounded-xl text-[9px] font-black tracking-[0.15em] uppercase flex items-center justify-center gap-1.5 transition-all disabled:opacity-60',
            status === 'success' && 'bg-green-600 text-white',
            status === 'error' && 'bg-mezo-rose-dark text-white',
            (status === 'idle' || status === 'loading') && 'bg-mezo-ink text-white hover:bg-mezo-rose-dark',
          )}
        >
          {status === 'success' ? (
            'Added ✓'
          ) : status === 'error' ? (
            'Failed — retry'
          ) : (
            <><ShoppingCart size={10} /> Add to Cart</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { navigate } = useAppNavigation();
  const { data: cartItems = [] } = useCart();
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const { btcDisplay, musdFormatted, musdRaw, isLoading: balancesLoading } = useWalletBalances();
  const [query, setQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { address } = useAccount();
  const { messages, isStreaming, error, sendMessage, reset, recentSearches } = useChat(address);
  const queryClient = useQueryClient();

  const { getProfile } = useAuth();
  const profile = getProfile();

  const sidebarItems = [
    { icon: <MessageSquare size={18} />, label: 'Stylist Chat', page: 'dashboard' },
    { icon: <Compass size={18} />, label: 'Discovery', page: 'discovery' },
    {
      icon: (
        <span className="relative">
          <ShoppingBag size={18} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-mezo-rose text-white text-[8px] font-black flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </span>
      ),
      label: 'My Cart',
      page: 'checkout',
    },
    { icon: <Package size={18} />, label: 'My Orders', page: 'orders' },
    { icon: <Bitcoin size={18} />, label: 'Borrow MUSD', page: 'borrow' },
  ];

  const quickPrompts = generateQuickPrompts({
    aesthetic: profile.aesthetic,
    shopFor: profile.shopFor,
    musdBalance: balancesLoading ? undefined : musdFormatted,
  });

  // Build userContext from profile + raw MUSD balance
  const musdBalanceNumeric = musdRaw ? parseFloat(musdRaw.formatted) : undefined;
  const userContext = {
    ...(profile.aesthetic ? { aesthetic: profile.aesthetic } : {}),
    ...(profile.shopFor ? { shopFor: profile.shopFor } : {}),
    ...(profile.size ? { size: profile.size } : {}),
    ...(musdBalanceNumeric !== undefined && !isNaN(musdBalanceNumeric) ? { musdBalance: musdBalanceNumeric } : {}),
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  async function handleSendMessage(text: string) {
    if (!text.trim() || isStreaming) return;
    setShowWelcome(false);
    setQuery('');
    await sendMessage(text, userContext);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSendMessage(query);
  }

  function handleNewChat() {
    reset();
    setShowWelcome(true);
  }

  function renderMessage(msg: ChatMessage) {
    if (msg.role === 'user') {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-end">
            <div className="bg-mezo-ink text-white px-5 py-3.5 rounded-2xl rounded-tr-none max-w-[70%] text-sm leading-relaxed">
              {msg.content}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-2xl bg-mezo-gold flex items-center justify-center text-white shrink-0 shadow-lg shadow-mezo-gold/20">
            <Sparkles size={16} />
          </div>
          <div className="space-y-4 flex-1 min-w-0">
            {msg.content && (
              <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-mezo-ink/5 shadow-sm inline-block max-w-[85%]">
                <MarkdownMessage content={msg.content} className="text-sm text-mezo-ink/80 leading-relaxed" />
              </div>
            )}
            {msg.products && msg.products.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {msg.products.map(product => (
                  <InlineProductCard
                    key={product.id}
                    product={product}
                    walletAddress={address}
                    onAddToCart={async (productId: string, size?: string, color?: string) => {
                      await backendClient.addCartItem(address ?? '', { productId, quantity: 1, size, color });
                      queryClient.invalidateQueries({ queryKey: ['cart'] });
                    }}
                    onNavigate={(productId: string) => navigate(`/product/${productId}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex h-screen bg-mezo-cream-dark overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-mezo-ink/5 hidden lg:flex flex-col p-8 justify-between">
        <div className="space-y-12">
          <button onClick={() => navigate('/')}>
            <Logo variant="light" size="sm" />
          </button>
          <nav className="space-y-4">
            {sidebarItems.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.page === 'dashboard' ? '/' : `/${item.page}`)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-4 rounded-xl text-[10px] tracking-[0.2em] font-black uppercase transition-all duration-300 group',
                  item.page === 'dashboard' ? 'bg-mezo-ink text-white shadow-xl shadow-mezo-ink/20' : 'text-mezo-ink/40 hover:bg-mezo-bg'
                )}
              >
                <span className={cn(item.page === 'dashboard' ? 'text-mezo-rose' : 'text-inherit group-hover:text-mezo-ink')}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-mezo-cream-light p-6 rounded-2xl border border-mezo-ink/5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bitcoin size={14} className="text-mezo-gold" />
            <span className="text-[9px] font-black tracking-widest uppercase text-mezo-ink/60">BTC Balance</span>
          </div>
          <p className="text-xl font-black text-mezo-ink">
            {balancesLoading ? '...' : `${btcDisplay} BTC`}
          </p>
          <div className="h-1.5 w-full bg-mezo-cream-dark rounded-full overflow-hidden">
            <div className="h-full w-3/5 bg-mezo-gold rounded-full" />
          </div>
          <p className="text-[9px] font-black tracking-widest uppercase text-mezo-ink/30">
            {balancesLoading ? '...' : `≈ ${musdFormatted} MUSD`}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-mezo-bg">
        {/* Header */}
        <header className="h-20 px-12 flex items-center justify-between border-b border-mezo-ink/5 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <span className="font-display font-black text-xl italic text-mezo-gold">Ai Stylist</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase text-green-700 tracking-widest">Online</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-mezo-ink/40 hover:text-mezo-ink transition-colors px-4 py-2 bg-white/50 rounded-full border border-mezo-ink/5"
            >
              <Plus size={14} /> New Chat
            </button>
            <div className="w-10 h-10 rounded-full bg-mezo-ink flex items-center justify-center text-white cursor-pointer" onClick={() => navigate('/profile')}>
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-8 md:px-12 py-8 hide-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8 pb-36">

            {/* Welcome state */}
            <AnimatePresence>
              {showWelcome && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="space-y-10 pt-8"
                >
                  <div className="text-center space-y-4">
                    <Sparkles className="mx-auto text-mezo-gold" size={32} />
                    <h1 className="font-display text-4xl font-black tracking-tighter text-mezo-ink italic">What's the vision today?</h1>
                    <p className="text-xs tracking-widest uppercase font-bold text-mezo-ink/30">Shop with BTC collateral. No selling required.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {quickPrompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(p)}
                        className="bg-white p-5 border border-mezo-ink/5 rounded-2xl text-[10px] uppercase font-black tracking-widest text-mezo-ink/40 hover:bg-mezo-ink hover:text-white transition-all shadow-sm text-left"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error state */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-2xl bg-mezo-rose/20 flex items-center justify-center text-mezo-rose shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-mezo-rose/20 shadow-sm inline-block max-w-[85%]">
                  <p className="text-sm text-mezo-rose/80 leading-relaxed">Shopping assistant is temporarily unavailable.</p>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map(msg => renderMessage(msg))}

            {/* Typing / streaming indicator */}
            <AnimatePresence>
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-20">
          <form onSubmit={handleSubmit}>
            <div className="bg-white p-2 md:p-3 rounded-2xl shadow-xl shadow-mezo-ink/10 border border-mezo-ink/5 backdrop-blur-2xl flex items-center gap-2 md:gap-3">
              {/* <button type="button" className="w-10 h-10 rounded-full border border-mezo-ink/5 flex items-center justify-center text-mezo-ink/40 hover:bg-mezo-bg hover:text-mezo-ink transition-all shrink-0">
                <Plus size={18} />
              </button> */}
              <div className="flex-1 flex items-center gap-3 bg-mezo-bg/50 px-5 py-1 rounded-full border border-mezo-ink/5">
                <Search className="text-mezo-ink/20 shrink-0" size={16} />
                <input
                  type="text"
                  placeholder="Ask your Ai stylist..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none placeholder:text-mezo-ink/20"
                />
                {/* <div className="hidden md:flex gap-3 text-mezo-ink/20">
                  <ImageIcon size={16} className="cursor-pointer hover:text-mezo-ink transition-colors" />
                  <Mic size={16} className="cursor-pointer hover:text-mezo-ink transition-colors" />
                </div> */}
              </div>
              <button
                type="submit"
                disabled={!query.trim() || isStreaming}
                className="w-10 h-10 rounded-full bg-mezo-ink flex items-center justify-center text-white shadow-lg shadow-mezo-ink/20 hover:bg-mezo-rose-dark active:scale-95 transition-all disabled:opacity-30 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Right panel */}
      <aside className="w-72 bg-white border-l border-mezo-ink/5 hidden xl:flex flex-col p-8 overflow-y-auto hide-scrollbar">
        <div className="space-y-10">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mezo-gold">Your Vault</span>
          </div>

          {/* BTC collateral card */}
          <div className="bg-mezo-ink text-white p-6 rounded-2xl space-y-4 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-mezo-gold/10 blur-2xl" />
            <div className="flex items-center gap-2 relative z-10">
              <Bitcoin size={16} className="text-mezo-gold" />
              <span className="text-[9px] font-black tracking-widest uppercase text-white/50">Collateral</span>
            </div>
            <p className="text-3xl font-black text-white relative z-10">
              {balancesLoading ? '...' : `${btcDisplay} BTC`}
            </p>
            <div className="space-y-1 relative z-10">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-white/40">MUSD Balance</span>
                <span className="text-mezo-gold">{balancesLoading ? '...' : `${musdFormatted} MUSD`}</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-mezo-gold rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-white/40">Available</span>
                <span className="text-white/60">{balancesLoading ? '...' : `${musdFormatted} MUSD`}</span>
              </div>
            </div>
            <button onClick={() => navigate('/borrow')} className="w-full bg-mezo-gold py-3 rounded-xl text-[9px] uppercase font-black tracking-widest hover:bg-white hover:text-mezo-ink transition-all relative z-10">
              Borrow More MUSD
            </button>
          </div>

          {/* Recent searches */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-mezo-ink">Recent Searches</h5>
            {recentSearches.length === 0 ? (
              <p className="text-[10px] text-mezo-ink/20 font-black uppercase tracking-widest">No searches yet</p>
            ) : recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(s)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-mezo-bg transition-colors group"
              >
                <Search size={12} className="text-mezo-ink/20 group-hover:text-mezo-ink transition-colors" />
                <span className="text-[11px] font-bold text-mezo-ink/50 group-hover:text-mezo-ink transition-colors truncate">{s}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
