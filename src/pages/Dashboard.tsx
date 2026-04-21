import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Compass, ShoppingBag, User, Plus, MessageSquare, Sparkles, Send, Mic, Image as ImageIcon, Bitcoin, ShoppingCart } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { IMAGES } from '@/src/lib/images';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useCart } from '@/src/hooks/queries';
import Logo from '@/src/components/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'ai';

interface ProductCard {
  id: number;
  name: string;
  brand: string;
  collection: string;
  musd: string;
  img: string;
}

interface Message {
  id: number;
  role: Role;
  text: string;
  products?: ProductCard[];
}

// ─── AI response catalogue ────────────────────────────────────────────────────

const AI_RESPONSES: { keywords: string[]; text: string; products: ProductCard[] }[] = [
  {
    keywords: ['coat', 'jacket', 'outerwear', 'winter', 'alabaster'],
    text: "Found the perfect match ✨ You have enough BTC collateral to borrow 5,600.00 MUSD — no selling required.",
    products: [
      { id: 1, name: 'Cashmere Overcoat', brand: 'Loro Piana', collection: 'Editorial Winter', musd: '5,600.00 MUSD', img: IMAGES.coats.cashmereCoat },
    ],
  },
  {
    keywords: ['bag', 'purse', 'handbag', 'tote', 'accessories'],
    text: "Here's what I curated from our luxury accessories vault. Your BTC collateral covers all of these.",
    products: [
      { id: 2, name: 'Quilted Chain Bag', brand: 'Chanel', collection: 'Accessories', musd: '4,800.00 MUSD', img: IMAGES.bags.quiltedChain },
      { id: 3, name: 'Black Tote', brand: 'Michael Kors', collection: 'Accessories', musd: '320.00 MUSD', img: IMAGES.bags.michaelKorsTote },
    ],
  },
  {
    keywords: ['watch', 'timepiece', 'rolex', 'chronograph'],
    text: "Timepieces are our most exclusive category. Here's what's available — your collateral ratio looks healthy.",
    products: [
      { id: 4, name: 'Royal Oak Chronograph', brand: 'Audemars Piguet', collection: 'Timepieces', musd: '28,500.00 MUSD', img: IMAGES.watch.chronograph },
      { id: 5, name: 'Silver Analog', brand: 'Rolex', collection: 'Timepieces', musd: '12,000.00 MUSD', img: IMAGES.watch.rolex },
    ],
  },
  {
    keywords: ['shoe', 'boot', 'sneaker', 'footwear', 'heel'],
    text: "Pulled these from the footwear vault. All available for immediate MUSD checkout.",
    products: [
      { id: 6, name: 'Leather Chelsea Boot', brand: 'Saint Laurent', collection: 'Footwear', musd: '890.00 MUSD', img: IMAGES.shoes.chelseaBoot },
      { id: 7, name: 'White Air Force 1', brand: 'Nike', collection: 'Sneakers', musd: '120.00 MUSD', img: IMAGES.shoes.nikeAirForce },
    ],
  },
  {
    keywords: ['suit', 'formal', 'menswear', 'blazer'],
    text: "Sharp choice. Here's a tailored option from our menswear collection — borrow MUSD against your BTC and it ships today.",
    products: [
      { id: 8, name: 'Tailored Wool Suit', brand: 'Tom Ford', collection: 'Menswear', musd: '1,240.00 MUSD', img: IMAGES.menswear.blackSuit },
    ],
  },
  {
    keywords: ['jewel', 'ring', 'necklace', 'bracelet', 'earring', 'diamond'],
    text: "Our fine jewellery collection is authenticated on-chain. Each piece comes with a Mezo Passport digital twin.",
    products: [
      { id: 9, name: 'Diamond Tennis Bracelet', brand: 'Tiffany & Co.', collection: 'Fine Jewellery', musd: '12,000.00 MUSD', img: IMAGES.jewellery.tennisBracelet },
    ],
  },
  {
    keywords: ['dress', 'gown', 'runway', 'fashion'],
    text: "Runway pieces are limited — here's what's still available. Your MUSD borrow is instant, no credit check.",
    products: [
      { id: 10, name: 'Silk Evening Gown', brand: 'Valentino', collection: 'Runway Series', musd: '3,200.00 MUSD', img: IMAGES.dresses.silkGown },
      { id: 11, name: 'Floral Mannequin Dress', brand: 'Valentino', collection: 'Runway Series', musd: '2,800.00 MUSD', img: IMAGES.dresses.floralMannequin },
    ],
  },
];

const FALLBACK_RESPONSE: Omit<typeof AI_RESPONSES[0], 'keywords'> = {
  text: "I've searched our full catalogue. Here are the top picks based on your query — all available for MUSD checkout using your BTC collateral.",
  products: [
    { id: 99, name: 'Cashmere Overcoat', brand: 'Loro Piana', collection: 'Editorial Winter', musd: '5,600.00 MUSD', img: IMAGES.coats.cashmereCoat },
    { id: 100, name: 'Quilted Chain Bag', brand: 'Chanel', collection: 'Accessories', musd: '4,800.00 MUSD', img: IMAGES.bags.quiltedChain },
  ],
};

function getAIResponse(query: string) {
  const q = query.toLowerCase();
  return AI_RESPONSES.find(r => r.keywords.some(k => q.includes(k))) ?? FALLBACK_RESPONSE;
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

function InlineProductCard({ product }: { product: ProductCard }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-44 shrink-0 group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-mezo-cream-dark shadow-md">
        <img
          src={product.img}
          alt={product.name}
          referrerPolicy="no-referrer"
          className={cn('w-full h-full object-cover transition-transform duration-700', hovered && 'scale-105')}
        />
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 p-2"
            >
              <button className="w-full bg-mezo-ink text-white text-[9px] font-bold tracking-[0.2em] uppercase py-2 flex items-center justify-center gap-1.5 hover:bg-mezo-rose-dark transition-colors">
                <ShoppingCart size={10} /> Add to Cart
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="pt-2.5 space-y-0.5">
        <p className="text-[8px] font-bold tracking-[0.2em] uppercase text-mezo-gold">{product.brand}</p>
        <p className="text-[11px] font-black text-mezo-ink leading-tight">{product.name}</p>
        <div className="flex items-center gap-1 pt-0.5">
          <Bitcoin size={9} className="text-mezo-ink/30" />
          <p className="text-[10px] font-bold text-mezo-ink/60">{product.musd}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { navigate } = useAppNavigation();
  const { data: cartItems = [] } = useCart();
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let msgId = useRef(0);

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
    { icon: <Bitcoin size={18} />, label: 'Borrow MUSD', page: 'borrow' },
  ];

  const quickPrompts = [
    'Find me a luxury coat',
    'Show me designer bags',
    'Best watches under 15k MUSD',
    'New runway drops',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    setShowWelcome(false);
    setQuery('');

    const userMsg: Message = { id: ++msgId.current, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const response = getAIResponse(text);
      const aiMsg: Message = {
        id: ++msgId.current,
        role: 'ai',
        text: response.text,
        products: response.products,
      };
      setIsTyping(false);
      setMessages(prev => [...prev, aiMsg]);
    }, 1800);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(query);
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
            <span className="text-[9px] font-black tracking-widest uppercase text-mezo-ink/60">BTC Collateral</span>
          </div>
          <p className="text-xl font-black text-mezo-ink">0.42 BTC</p>
          <div className="h-1.5 w-full bg-mezo-cream-dark rounded-full overflow-hidden">
            <div className="h-full w-3/5 bg-mezo-gold rounded-full" />
          </div>
          <p className="text-[9px] font-black tracking-widest uppercase text-mezo-ink/30">≈ 24,800 MUSD available</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-mezo-bg">
        {/* Header */}
        <header className="h-20 px-12 flex items-center justify-between border-b border-mezo-ink/5 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <span className="font-display font-black text-xl italic text-mezo-gold">Bitcoin Stylist</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase text-green-700 tracking-widest">Online</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { setMessages([]); setShowWelcome(true); }}
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
              {showWelcome && (
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
                        onClick={() => sendMessage(p)}
                        className="bg-white p-5 border border-mezo-ink/5 rounded-2xl text-[10px] uppercase font-black tracking-widest text-mezo-ink/40 hover:bg-mezo-ink hover:text-white transition-all shadow-sm text-left"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="bg-mezo-ink text-white px-5 py-3.5 rounded-2xl rounded-tr-none max-w-[70%] text-sm leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  /* AI bubble + optional product cards */
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-2xl bg-mezo-gold flex items-center justify-center text-white shrink-0 shadow-lg shadow-mezo-gold/20">
                      <Sparkles size={16} />
                    </div>
                    <div className="space-y-4 flex-1 min-w-0">
                      <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-mezo-ink/5 shadow-sm inline-block max-w-[85%]">
                        <p className="text-sm text-mezo-ink/80 leading-relaxed">{msg.text}</p>
                      </div>
                      {msg.products && msg.products.length > 0 && (
                        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                          {msg.products.map(product => (
                            <InlineProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
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
              <button type="button" className="w-10 h-10 rounded-full border border-mezo-ink/5 flex items-center justify-center text-mezo-ink/40 hover:bg-mezo-bg hover:text-mezo-ink transition-all shrink-0">
                <Plus size={18} />
              </button>
              <div className="flex-1 flex items-center gap-3 bg-mezo-bg/50 px-5 py-1 rounded-full border border-mezo-ink/5">
                <Search className="text-mezo-ink/20 shrink-0" size={16} />
                <input
                  type="text"
                  placeholder="Ask your Bitcoin stylist..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent py-3.5 text-sm focus:outline-none placeholder:text-mezo-ink/20"
                />
                <div className="hidden md:flex gap-3 text-mezo-ink/20">
                  <ImageIcon size={16} className="cursor-pointer hover:text-mezo-ink transition-colors" />
                  <Mic size={16} className="cursor-pointer hover:text-mezo-ink transition-colors" />
                </div>
              </div>
              <button
                type="submit"
                disabled={!query.trim() || isTyping}
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
            <p className="text-3xl font-black text-white relative z-10">0.42 BTC</p>
            <div className="space-y-1 relative z-10">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-white/40">Borrowed</span>
                <span className="text-mezo-gold">2,400 MUSD</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-2/5 bg-mezo-gold rounded-full" />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-white/40">Available</span>
                <span className="text-white/60">22,400 MUSD</span>
              </div>
            </div>
            <button className="w-full bg-mezo-gold py-3 rounded-xl text-[9px] uppercase font-black tracking-widest hover:bg-white hover:text-mezo-ink transition-all relative z-10">
              Borrow More MUSD
            </button>
          </div>

          {/* Recent searches */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-mezo-ink">Recent Searches</h5>
            {['Luxury coats', 'Designer bags', 'Rolex watches'].map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-mezo-bg transition-colors group"
              >
                <Search size={12} className="text-mezo-ink/20 group-hover:text-mezo-ink transition-colors" />
                <span className="text-[11px] font-bold text-mezo-ink/50 group-hover:text-mezo-ink transition-colors">{s}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
