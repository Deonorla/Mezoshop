import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bitcoin, ShieldCheck, Zap, CheckCircle2, ChevronRight, Wallet } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useCart, useRemoveFromCart, useBorrowPosition, useBorrow } from '@/src/hooks/queries';

type Step = 'review' | 'borrow' | 'confirm' | 'success';

const STEPS: { key: Step; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'borrow', label: 'Borrow MUSD' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'success', label: 'Done' },
];

export default function Checkout() {
  const { navigate } = useAppNavigation();
  const [step, setStep] = useState<Step>('review');

  const { data: cartItems = [], isLoading: cartLoading } = useCart();
  const removeFromCart = useRemoveFromCart();
  const { data: borrow } = useBorrowPosition();
  const borrowMutation = useBorrow();

  const total = cartItems.reduce((s, i) => s + i.product.musd * i.quantity, 0);
  const btcCollateral = borrow?.btcLocked ?? 0;
  const availableMUSD = borrow?.available ?? 0;
  const borrowRatio = availableMUSD > 0 ? Math.round((total / availableMUSD) * 100) : 0;

  function handleBorrow() {
    borrowMutation.mutate(total, {
      onSuccess: () => setStep('confirm'),
    });
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-mezo-ink text-white font-sans selection:bg-mezo-gold/30">

      {/* ── Header ── */}
      <header className="px-8 md:px-12 py-8 flex justify-between items-center border-b border-white/5 bg-mezo-ink/80 backdrop-blur-xl sticky top-0 z-50">
        <button
          onClick={() => step === 'review' ? navigate('/dashboard') : setStep(STEPS[stepIndex - 1].key)}
          className="flex items-center gap-3 text-white/40 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black tracking-[0.3em] uppercase">
            {step === 'review' ? 'Back' : 'Previous'}
          </span>
        </button>

        <h1 className="font-display text-xl font-black tracking-tighter italic">Checkout</h1>

        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all',
                i < stepIndex ? 'bg-green-500 text-white' :
                i === stepIndex ? 'bg-mezo-gold text-white' :
                'bg-white/10 text-white/30'
              )}>
                {i < stepIndex ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span className={cn(
                'text-[9px] font-black tracking-widest uppercase transition-colors',
                i === stepIndex ? 'text-white' : 'text-white/30'
              )}>{s.label}</span>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-white/20" />}
            </div>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 md:px-12 py-12">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Review ── */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-12"
            >
              {/* Cart items */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="font-display text-3xl font-black tracking-tighter italic">Your Cart</h2>
                {cartLoading ? (
                  <div className="space-y-4">
                    {[1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
                  </div>
                ) : cartItems.length === 0 ? (
                  <p className="text-white/30 text-sm">Your cart is empty.</p>
                ) : cartItems.map(item => (
                  <div key={item.productId} className="flex gap-5 bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="w-20 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img src={item.product.images[0]} alt={item.product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] font-black tracking-[0.3em] uppercase text-mezo-gold mb-1">{item.product.brand}</p>
                        <p className="font-display text-lg font-black italic text-white">{item.product.name}</p>
                        {item.size && <p className="text-[9px] text-white/30 mt-0.5">Size: {item.size}</p>}
                      </div>
                      <div className="flex items-center justify-between">
                        <button onClick={() => removeFromCart.mutate(item.productId)} className="text-[9px] text-white/20 hover:text-mezo-rose transition-colors uppercase tracking-widest font-black">Remove</button>
                        <p className="font-display text-xl font-black text-white">{item.product.musd.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                  <h3 className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40">Order Summary</h3>
                  {/* Summary */}
                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span className="text-white/50 truncate mr-4">{item.product.name}</span>
                        <span className="text-white font-bold shrink-0">{item.product.musd.toLocaleString()} MUSD</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Total</span>
                    <div className="text-right">
                      <p className="font-display text-3xl font-black text-white">{total.toLocaleString()}</p>
                      <p className="text-mezo-gold text-xs font-black">MUSD</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('borrow')}
                    className="w-full flex items-center justify-center gap-2 bg-mezo-gold py-4 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-lg shadow-mezo-gold/20"
                  >
                    <Bitcoin size={14} /> Continue to Borrow
                  </button>
                </div>

                {/* BTC collateral preview */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bitcoin size={14} className="text-mezo-gold" />
                    <span className="text-[9px] font-black tracking-widest uppercase text-white/40">Your Collateral</span>
                  </div>
                  <p className="text-2xl font-black text-white">{btcCollateral} BTC</p>
                  <p className="text-[10px] text-white/30">≈ {availableMUSD.toLocaleString()} MUSD available</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Borrow MUSD ── */}
          {step === 'borrow' && (
            <motion.div
              key="borrow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto space-y-8"
            >
              <div className="text-center space-y-3">
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-mezo-gold">Step 2 of 3</p>
                <h2 className="font-display text-4xl font-black tracking-tighter italic">Borrow MUSD</h2>
                <p className="text-sm text-white/40">Your BTC stays locked as collateral. MUSD is borrowed instantly.</p>
              </div>

              {/* Collateral card */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'BTC Collateral', value: `${btcCollateral} BTC`, sub: 'Locked on Mezo' },
                    { label: 'Available MUSD', value: `${availableMUSD.toLocaleString()}`, sub: 'Ready to borrow' },
                    { label: 'Borrow Amount', value: `${total.toLocaleString()} MUSD`, sub: 'For this order' },
                    { label: 'Interest Rate', value: '0%', sub: 'Forever free' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 space-y-1">
                      <p className="text-[8px] font-black tracking-widest uppercase text-white/30">{s.label}</p>
                      <p className="font-display text-lg font-black text-white">{s.value}</p>
                      <p className="text-[9px] text-white/30">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Collateral ratio bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-white/30">Collateral Used</span>
                    <span className="text-mezo-gold">{borrowRatio}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${borrowRatio}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-mezo-gold rounded-full"
                    />
                  </div>
                  <p className="text-[9px] text-white/20">Safe zone · Liquidation at 80%</p>
                </div>
              </div>

              <button
                onClick={handleBorrow}
                disabled={borrowMutation.isPending}
                className="w-full flex items-center justify-center gap-3 bg-mezo-gold py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-mezo-gold/20 disabled:opacity-60"
              >
                {borrowMutation.isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Borrowing MUSD...
                  </>
                ) : (
                  <><Bitcoin size={16} /> Borrow {total.toLocaleString()} MUSD</>
                )}
              </button>

              <div className="flex items-start gap-3 bg-white/5 border border-white/8 rounded-2xl p-5">
                <ShieldCheck size={16} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Your BTC is never sold. It remains locked as collateral on the Mezo protocol. You can repay MUSD at any time to unlock your BTC.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto space-y-8"
            >
              <div className="text-center space-y-3">
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-mezo-gold">Step 3 of 3</p>
                <h2 className="font-display text-4xl font-black tracking-tighter italic">Confirm Order</h2>
                <p className="text-sm text-white/40">Review and place your order.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-5">
                <h3 className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40">Order Details</h3>
                {cartItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-4">
                    <div className="w-12 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img src={item.product.images[0]} alt={item.product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">{item.product.name}</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">{item.product.brand}</p>
                    </div>
                    <p className="font-black text-white">{item.product.musd.toLocaleString()} MUSD</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Total Borrowed</span>
                  <div className="flex items-center gap-2">
                    <Bitcoin size={14} className="text-mezo-gold" />
                    <span className="font-display text-2xl font-black text-white">{total.toLocaleString()} MUSD</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-mezo-gold/20 flex items-center justify-center">
                  <Wallet size={18} className="text-mezo-gold" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Mezo Passport</p>
                  <p className="text-[9px] text-white/30 font-mono">0x72...91b0</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Connected</span>
                </div>
              </div>

              <button
                onClick={() => setStep('success')}
                className="w-full flex items-center justify-center gap-3 bg-mezo-gold py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-mezo-gold/20"
              >
                <Zap size={16} /> Place Order
              </button>
            </motion.div>
          )}

          {/* ── Step 4: Success ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center space-y-8 py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 size={40} className="text-green-400" />
              </motion.div>

              <div className="space-y-3">
                <h2 className="font-display text-4xl font-black tracking-tighter italic text-white">Order Placed!</h2>
                <p className="text-white/40 leading-relaxed">
                  Your MUSD has been borrowed and payment confirmed. Your items will ship within 24 hours.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 text-left">
                {[
                  { label: 'Order ID', value: '#MZ-' + Math.random().toString(36).slice(2, 8).toUpperCase() },
                  { label: 'MUSD Borrowed', value: `${total.toLocaleString()} MUSD` },
                  { label: 'BTC Collateral', value: `${btcCollateral} BTC (locked)` },
                  { label: 'Interest', value: '0% — forever' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-white/30">{r.label}</span>
                    <span className="text-white font-bold">{r.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full py-4 bg-mezo-gold rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all"
                >
                  Track Order
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase text-white/50 hover:bg-white/10 transition-all"
                >
                  Continue Shopping
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
