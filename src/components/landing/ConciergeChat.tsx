import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bitcoin, ArrowRight, Send } from 'lucide-react';
import { PRODUCTS } from '@/src/lib/products';

interface ConciergeChatProps {
  onNavigate: (page: string) => void;
}

// 3 demo conversations cycling through real products
const DEMOS = [
  {
    userMsg: 'Find me a stylish coat under 100 MUSD',
    aiMsg: 'Found it ✨ Your BTC collateral covers this — borrow',
    productId: 32, // Fashion Coat
  },
  {
    userMsg: 'Show me trending sneakers',
    aiMsg: 'Here\'s a top pick ✨ Borrow',
    productId: 1, // Phantom Runner
  },
  {
    userMsg: 'I need a bag for the weekend',
    aiMsg: 'Perfect match ✨ Your collateral covers',
    productId: 28, // Textured Tote Bag
  },
];

// 0 idle → 1 user → 2 typing → 3 ai reply → 4 product card → loop
const SEQUENCE = [
  { step: 1, delay: 800 },
  { step: 2, delay: 1800 },
  { step: 3, delay: 3200 },
  { step: 4, delay: 4000 },
  { step: 0, delay: 8500 },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-mezo-cream-dark rounded-2xl rounded-tl-none w-fit">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-mezo-ink/40 inline-block"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function AiAvatar() {
  return (
    <div className="w-6 h-6 rounded-full bg-mezo-ink flex items-center justify-center shrink-0">
      <Bitcoin size={10} className="text-mezo-rose" />
    </div>
  );
}

function InlineProductCard({ productId, onNavigate }: { productId: number; onNavigate: (p: string) => void }) {
  const product = PRODUCTS.find(p => p.id === productId) ?? PRODUCTS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-mezo-cream-light border border-mezo-ink/8 rounded-xl overflow-hidden cursor-pointer"
      onClick={() => onNavigate(`/product/${product.id}`)}
    >
      <div className="relative h-28 overflow-hidden bg-neutral-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <span className="absolute top-2 left-2 bg-mezo-ink text-white text-[8px] font-bold tracking-[0.2em] uppercase px-2 py-1">
          {product.tag}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 mr-2">
            <p className="text-[8px] font-bold tracking-[0.2em] uppercase text-mezo-ink/40 mb-0.5 truncate">
              {product.brand}
            </p>
            <p className="text-xs font-bold text-mezo-ink truncate">{product.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-mezo-gold">{product.musd} MUSD</p>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <Bitcoin size={7} className="text-mezo-ink/30" />
              <p className="text-[8px] text-mezo-ink/30">BTC-backed</p>
            </div>
          </div>
        </div>
        <button className="w-full bg-mezo-ink text-white text-[9px] font-bold tracking-[0.2em] uppercase py-2 hover:bg-mezo-rose-dark transition-colors rounded-sm">
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
}

function ChatDemo({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [step, setStep] = useState(0);
  const [demoIndex, setDemoIndex] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const demo = DEMOS[demoIndex];

  useEffect(() => {
    function run() {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
      SEQUENCE.forEach(({ step: s, delay }) => {
        const t = setTimeout(() => {
          setStep(s);
          if (s === 0) {
            setDemoIndex(i => (i + 1) % DEMOS.length);
            run();
          }
        }, delay);
        timeouts.current.push(t);
      });
    }
    run();
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-mezo-ink/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-mezo-ink/5">
        <div className="w-8 h-8 rounded-full bg-mezo-ink flex items-center justify-center">
          <Bitcoin size={14} className="text-mezo-rose" />
        </div>
        <div>
          <p className="text-xs font-bold text-mezo-ink">Mezo Stylist</p>
          <p className="text-[10px] text-mezo-ink/40">Bitcoin-powered</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-mezo-ink/30">Always on</span>
        </div>
      </div>

      {/* Messages */}
      <div className="px-5 py-5 h-80 overflow-hidden space-y-3">

        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key={`user-${demoIndex}`}
              className="flex justify-end"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-mezo-ink rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%]">
                <p className="text-xs text-white/90 leading-relaxed">{demo.userMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div
              key={`typing-${demoIndex}`}
              className="flex items-end gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AiAvatar />
              <TypingDots />
            </motion.div>
          )}

          {step >= 3 && (
            <motion.div
              key={`ai-${demoIndex}`}
              className="flex items-end gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AiAvatar />
              <div className="bg-mezo-cream-dark rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[85%]">
                <p className="text-xs text-mezo-ink/80 leading-relaxed">
                  {demo.aiMsg}{' '}
                  <span className="font-bold text-mezo-gold">{PRODUCTS.find(p => p.id === demo.productId)?.musd} MUSD</span>
                  {' '}— no selling required.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 4 && (
            <motion.div key={`product-${demoIndex}`} className="ml-8">
              <InlineProductCard productId={demo.productId} onNavigate={onNavigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-t border-mezo-ink/5 cursor-pointer group"
        onClick={() => onNavigate('dashboard')}
      >
        <input
          readOnly
          placeholder="Ask your Bitcoin stylist..."
          className="flex-1 text-xs text-mezo-ink/40 bg-transparent outline-none cursor-pointer placeholder:text-mezo-ink/30"
        />
        <button className="w-8 h-8 rounded-full bg-mezo-ink flex items-center justify-center group-hover:bg-mezo-rose-dark transition-colors">
          <Send size={12} className="text-white" />
        </button>
      </div>
    </div>
  );
}

export default function ConciergeChat({ onNavigate }: ConciergeChatProps) {
  return (
    <section className="bg-mezo-bg py-32 px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-mezo-gold mb-4">
            AI CONCIERGE
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-black text-mezo-ink leading-tight mb-6">
            Your Personal
            <br />
            AI Stylist
          </h2>
          <p className="text-sm text-mezo-ink/60 leading-relaxed mb-8 max-w-sm">
            Describe what you're looking for and our AI stylist will curate the
            perfect pieces — then help you check out with MUSD in seconds.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] uppercase text-mezo-ink border-b border-mezo-ink pb-0.5 hover:text-mezo-gold hover:border-mezo-gold transition-colors"
          >
            Open Stylist <ArrowRight size={12} />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <ChatDemo onNavigate={onNavigate} />
        </motion.div>
      </div>
    </section>
  );
}
