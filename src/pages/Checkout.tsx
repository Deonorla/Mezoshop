import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bitcoin, ShieldCheck, Zap, CheckCircle2, ChevronRight, Wallet, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { cn } from '@/src/lib/utils';
import { MEZO_TESTNET_CHAIN_ID } from '@/src/lib/musd';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useCart, useRemoveFromCart } from '@/src/hooks/queries';
import { useMUSDBalance } from '@/src/hooks/useMUSDBalance';
import { useMUSDCheckout, InsufficientBalanceError } from '@/src/hooks/useMUSDCheckout';
import type { CartItem as BackendCartItem } from '@/src/lib/backendClient';
import WrongNetworkBanner from '@/src/components/WrongNetworkBanner';

type Step = 'review' | 'confirm' | 'success';

// Returns the first image matching the selected color by scanning filenames
function getColorImage(images: string[], colors?: string[], selectedColor?: string): string | undefined {
  if (!selectedColor || !images.length) return undefined;
  const colorLower = selectedColor.toLowerCase().replace(/\s+/g, '_');
  return images.find(img => img.toLowerCase().includes(colorLower));
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'confirm', label: 'Confirm' },
  { key: 'success', label: 'Done' },
];

export default function Checkout() {
  const { navigate } = useAppNavigation();
  const [step, setStep] = useState<Step>('review');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [insufficientError, setInsufficientError] = useState<{ required: bigint; available: bigint } | null>(null);
  const [orderWarning, setOrderWarning] = useState<string | null>(null);

  const { address, chainId } = useAccount();
  const isWrongNetwork = chainId !== MEZO_TESTNET_CHAIN_ID;

  const { data: cartItems = [], isLoading: cartLoading } = useCart();
  const removeFromCart = useRemoveFromCart();
  const { balance: musdBalance, formatted: musdFormatted, isLoading: balanceLoading } = useMUSDBalance(address);
  const { checkout, isPending, error: checkoutError } = useMUSDCheckout();

  const total = cartItems.reduce((s, i) => s + i.product.musd * i.quantity, 0);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  // Adapter: map CartEntry (local) to BackendCartItem format
  function toBackendCartItems(): BackendCartItem[] {
    return cartItems.map(entry => ({
      id: String(entry.productId),
      walletAddress: address ?? '',
      productId: String(entry.productId),
      quantity: entry.quantity,
      size: entry.size,
      color: entry.color,
      addedAt: new Date().toISOString(),
    }));
  }

  async function handleCheckout() {
    setInsufficientError(null);
    setOrderWarning(null);

    try {
      const backendItems = toBackendCartItems();
      const result = await checkout(backendItems, total);
      setTxHash(result.txHash);
      setOrderId(result.orderId);

      // Check if there was an order recording warning (error contains txHash)
      if (checkoutError && checkoutError.includes(result.txHash)) {
        setOrderWarning(checkoutError);
      }

      setStep('success');
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        setInsufficientError({ required: err.required, available: err.available });
      } else if (
        err instanceof Error &&
        (err.name === 'UserRejectedRequestError' ||
          err.message.includes('User rejected') ||
          err.message.includes('user rejected'))
      ) {
        setToast('Transaction cancelled.');
        setTimeout(() => setToast(null), 4000);
      }
      // Other errors are shown via checkoutError state from the hook
    }
  }

  return (
    <div className="min-h-screen bg-mezo-ink text-white font-sans selection:bg-mezo-gold/30">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-white text-mezo-ink px-6 py-3 rounded-2xl shadow-xl text-sm font-black"
          >
            {toast}
            <button onClick={() => setToast(null)} className="text-mezo-ink/40 hover:text-mezo-ink">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Wrong Network Banner ── */}
      <WrongNetworkBanner />

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
                      <img
                        src={getColorImage(item.product.images, item.product.colors, item.color) ?? item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] font-black tracking-[0.3em] uppercase text-mezo-gold mb-1">{item.product.brand}</p>
                        <p className="font-display text-lg font-black italic text-white">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.color && (
                            <span className="text-[9px] text-white/40 font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full">
                              {item.color}
                            </span>
                          )}
                          {item.size && (
                            <span className="text-[9px] text-white/40 font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full">
                              {item.size}
                            </span>
                          )}
                        </div>
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
                    onClick={() => setStep('confirm')}
                    disabled={cartItems.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-mezo-gold py-4 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-lg shadow-mezo-gold/20 disabled:opacity-40"
                  >
                    <Zap size={14} /> Continue to Pay
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto space-y-8"
            >
              <div className="text-center space-y-3">
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-mezo-gold">Step 2 of 2</p>
                <h2 className="font-display text-4xl font-black tracking-tighter italic">Confirm Order</h2>
                <p className="text-sm text-white/40">Review and pay with MUSD.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-5">
                <h3 className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40">Order Details</h3>
                {cartItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-4">
                    <div className="w-12 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img
                        src={getColorImage(item.product.images, item.product.colors, item.color) ?? item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">{item.product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest">{item.product.brand}</p>
                        {item.color && <span className="text-[9px] text-white/30">· {item.color}</span>}
                        {item.size && <span className="text-[9px] text-white/30">· {item.size}</span>}
                      </div>
                    </div>
                    <p className="font-black text-white">{item.product.musd.toLocaleString()} MUSD</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Total</span>
                  <div className="flex items-center gap-2">
                    <Bitcoin size={14} className="text-mezo-gold" />
                    <span className="font-display text-2xl font-black text-white">{total.toLocaleString()} MUSD</span>
                  </div>
                </div>
              </div>

              {/* MUSD Balance */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-mezo-gold/20 flex items-center justify-center">
                  <Wallet size={18} className="text-mezo-gold" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">MUSD Balance</p>
                  <p className="text-[9px] text-white/30 font-mono">
                    {balanceLoading ? 'Loading...' : `${Number(musdFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} MUSD`}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', musdBalance !== undefined && musdBalance >= BigInt(Math.floor(total)) * BigInt(10 ** 18) ? 'bg-green-400' : 'bg-mezo-rose')} />
                  <span className={cn('text-[9px] font-black uppercase tracking-widest', musdBalance !== undefined && musdBalance >= BigInt(Math.floor(total)) * BigInt(10 ** 18) ? 'text-green-400' : 'text-mezo-rose')}>
                    {musdBalance !== undefined && musdBalance >= BigInt(Math.floor(total)) * BigInt(10 ** 18) ? 'Sufficient' : 'Insufficient'}
                  </span>
                </div>
              </div>

              {/* Insufficient balance error */}
              {insufficientError && (
                <div className="bg-mezo-rose/10 border border-mezo-rose/30 rounded-2xl p-5 space-y-2">
                  <p className="text-sm font-black text-mezo-rose">Insufficient MUSD Balance</p>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    You need {Number(formatUnits(insufficientError.required, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} MUSD but only have {Number(formatUnits(insufficientError.available, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} MUSD.{' '}
                    <a
                      href="https://faucet.test.mezo.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mezo-gold underline hover:text-white transition-colors"
                    >
                      Get MUSD from faucet
                    </a>
                  </p>
                </div>
              )}

              {/* Generic checkout error (not insufficient balance, not user rejected) */}
              {checkoutError && !insufficientError && !checkoutError.includes('Order recording failed') && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                  <p className="text-[11px] text-red-300">{checkoutError}</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isPending || isWrongNetwork || cartItems.length === 0}
                className="w-full flex items-center justify-center gap-3 bg-mezo-gold py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-mezo-gold/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-mezo-gold disabled:hover:text-white"
              >
                {isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Processing Payment...
                  </>
                ) : (
                  <><Zap size={16} /> Pay with MUSD</>
                )}
              </button>

              {isWrongNetwork && (
                <p className="text-center text-[10px] text-mezo-rose font-black tracking-widest uppercase">
                  Switch to Mezo Testnet to place your order
                </p>
              )}

              <div className="flex items-start gap-3 bg-white/5 border border-white/8 rounded-2xl p-5">
                <ShieldCheck size={16} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Your MUSD will be transferred directly to the merchant wallet on Mezo Testnet. The transaction is irreversible once confirmed.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
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
                  Your MUSD payment has been confirmed on-chain. Your items will ship within 24 hours.
                </p>
              </div>

              {/* Order recording warning */}
              {orderWarning && (
                <div className="bg-mezo-gold/10 border border-mezo-gold/30 rounded-2xl p-5 text-left space-y-2">
                  <p className="text-[11px] font-black text-mezo-gold uppercase tracking-widest">Order Recording Notice</p>
                  <p className="text-[11px] text-white/60 leading-relaxed">{orderWarning}</p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 text-left">
                {[
                  { label: 'Order ID', value: orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : '#—' },
                  { label: 'Total Paid', value: `${total.toLocaleString()} MUSD` },
                  { label: 'Transaction', value: txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}` : '—' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-white/30">{r.label}</span>
                    <span className="text-white font-bold font-mono">{r.value}</span>
                  </div>
                ))}
                {txHash && (
                  <div className="pt-2 border-t border-white/10">
                    <a
                      href={`https://explorer.test.mezo.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-mezo-gold hover:text-white transition-colors font-black uppercase tracking-widest"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
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
