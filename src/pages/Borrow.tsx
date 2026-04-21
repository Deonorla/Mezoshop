import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bitcoin, ShieldCheck, Zap, TrendingUp, RefreshCw, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useBorrowPosition, useBorrowHistory, useBorrow, useRepay } from '@/src/hooks/queries';

export default function Borrow() {
  const { navigate } = useAppNavigation();
  const [borrowAmount, setBorrowAmount] = useState(1000);
  const [tab, setTab] = useState<'borrow' | 'repay'>('borrow');

  const { data: position, isLoading: positionLoading } = useBorrowPosition();
  const { data: history = [] } = useBorrowHistory();
  const borrowMutation = useBorrow();
  const repayMutation = useRepay();

  const btcLocked = position?.btcLocked ?? 0;
  const btcPriceUSD = position?.btcPriceUSD ?? 0;
  const collateralValueUSD = position?.collateralValueUSD ?? 0;
  const totalBorrowable = position?.totalBorrowable ?? 0;
  const alreadyBorrowed = position?.alreadyBorrowed ?? 0;
  const available = position?.available ?? 0;

  const newTotal = alreadyBorrowed + (tab === 'borrow' ? borrowAmount : -borrowAmount);
  const collateralRatio = collateralValueUSD > 0 ? Math.round((newTotal / collateralValueUSD) * 100) : 0;
  const healthColor = collateralRatio < 50 ? 'text-green-400' : collateralRatio < 65 ? 'text-mezo-gold' : 'text-red-400';
  const barColor = collateralRatio < 50 ? 'bg-green-500' : collateralRatio < 65 ? 'bg-mezo-gold' : 'bg-red-500';

  const txPending = borrowMutation.isPending || repayMutation.isPending;
  const txDone = borrowMutation.isSuccess || repayMutation.isSuccess;

  function handleTx() {
    if (tab === 'borrow') {
      borrowMutation.mutate(borrowAmount);
    } else {
      repayMutation.mutate(borrowAmount);
    }
  }

  const STATS = [
    { label: 'BTC Locked', value: `${btcLocked} BTC`, sub: `≈ $${collateralValueUSD.toLocaleString()}` },
    { label: 'MUSD Borrowed', value: `${alreadyBorrowed.toLocaleString()}`, sub: 'of ' + totalBorrowable.toLocaleString() + ' max' },
    { label: 'Available to Borrow', value: `${available.toLocaleString()}`, sub: 'MUSD remaining' },
    { label: 'Interest Rate', value: '0%', sub: 'Forever free' },
  ];

  const HISTORY = [
    { type: 'borrow', amount: 1200, date: 'Apr 18, 2026', status: 'confirmed' },
    { type: 'borrow', amount: 1200, date: 'Apr 10, 2026', status: 'confirmed' },
    { type: 'repay', amount: 500, date: 'Apr 5, 2026', status: 'confirmed' },
  ];

  return (
    <div className="min-h-screen bg-mezo-ink text-white font-sans selection:bg-mezo-gold/30">

      {/* ── Header ── */}
      <header className="px-8 md:px-12 py-8 flex justify-between items-center border-b border-white/5 bg-mezo-ink/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 hover:bg-white/5 rounded-full transition-colors group"
          >
            <ArrowLeft className="text-white/40 group-hover:text-white transition-colors" size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tighter italic">Borrow MUSD</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-mezo-gold mt-0.5">
              Bitcoin-backed · 0% Interest
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-black tracking-widest uppercase text-white/60">Mezo Protocol</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 md:px-12 py-12 space-y-10">

        {/* ── Stats row ── */}
        {positionLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-3xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 opacity-[0.04] scale-150 group-hover:scale-125 transition-transform duration-700">
                  <Bitcoin size={60} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">{stat.label}</p>
                <p className="text-2xl font-display font-black tracking-tighter text-white group-hover:text-mezo-gold transition-colors">
                  {stat.value}
                </p>
                <p className="text-[10px] text-white/30 mt-1">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Left: Borrow / Repay form ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Tab switcher */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 w-fit">
              {(['borrow', 'repay'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setBorrowAmount(1000); setTxDone(false); }}
                  className={cn(
                    'px-8 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all',
                    tab === t ? 'bg-white text-mezo-ink shadow-lg' : 'text-white/40 hover:text-white'
                  )}
                >
                  {t === 'borrow' ? 'Borrow' : 'Repay'}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">
                  {tab === 'borrow' ? 'Amount to Borrow' : 'Amount to Repay'}
                </p>
                <button
                  onClick={() => setBorrowAmount(tab === 'borrow' ? available : alreadyBorrowed)}
                  className="text-[9px] font-black tracking-widest uppercase text-mezo-gold hover:text-white transition-colors"
                >
                  Max
                </button>
              </div>

              {/* Big number input */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={e => setBorrowAmount(Math.max(0, Math.min(
                      tab === 'borrow' ? available : alreadyBorrowed,
                      Number(e.target.value)
                    )))}
                    className="w-full bg-transparent font-display text-5xl font-black text-white focus:outline-none tracking-tighter"
                  />
                  <p className="text-mezo-gold font-black text-sm mt-1">MUSD</p>
                </div>
                <div className="flex flex-col gap-1 pb-6">
                  <button
                    onClick={() => setBorrowAmount(v => Math.min(tab === 'borrow' ? available : alreadyBorrowed, v + 100))}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => setBorrowAmount(v => Math.max(0, v - 100))}
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={tab === 'borrow' ? available : alreadyBorrowed}
                value={borrowAmount}
                onChange={e => setBorrowAmount(Number(e.target.value))}
                className="w-full accent-mezo-gold"
              />
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/20">
                <span>0</span>
                <span>{(tab === 'borrow' ? available : alreadyBorrowed).toLocaleString()} MUSD</span>
              </div>
            </div>

            {/* Health factor preview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">Collateral Ratio After</p>
                <p className={cn('text-xl font-black', healthColor)}>{collateralRatio}%</p>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.min(collateralRatio, 100)}%` }}
                  transition={{ duration: 0.4 }}
                  className={cn('h-full rounded-full', barColor)}
                />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-green-400">Safe &lt;50%</span>
                <span className="text-mezo-gold">Caution 50–65%</span>
                <span className="text-red-400">Risk &gt;65%</span>
              </div>
              {collateralRatio > 65 && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <p className="text-[10px] text-red-300">High collateral ratio. Consider borrowing less.</p>
                </div>
              )}
            </div>

            {/* CTA */}
            <AnimatePresence mode="wait">
              {txDone ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex items-center justify-center gap-3 bg-green-500/20 border border-green-500/30 py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase text-green-400"
                >
                  <ShieldCheck size={16} />
                  {tab === 'borrow' ? 'MUSD Borrowed Successfully' : 'Repayment Confirmed'}
                </motion.div>
              ) : (
                <motion.button
                  key="cta"
                  onClick={handleTx}
                  disabled={txPending || borrowAmount === 0 || collateralRatio > 75}
                  className="w-full flex items-center justify-center gap-3 bg-mezo-gold py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-mezo-gold/20 disabled:opacity-40"
                >
                  {txPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      {tab === 'borrow' ? <Bitcoin size={16} /> : <RefreshCw size={16} />}
                      {tab === 'borrow'
                        ? `Borrow ${borrowAmount.toLocaleString()} MUSD`
                        : `Repay ${borrowAmount.toLocaleString()} MUSD`}
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: Info + History ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Protocol info */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
              <p className="text-[10px] font-black tracking-[0.4em] uppercase text-mezo-gold">How It Works</p>
              {[
                { icon: <Bitcoin size={14} className="text-mezo-gold" />, title: 'Lock BTC', desc: 'Your Bitcoin stays on Mezo. Never sold, never moved.' },
                { icon: <Zap size={14} className="text-mezo-rose" />, title: 'Borrow MUSD', desc: 'Instantly borrow up to 60% of your BTC value as MUSD.' },
                { icon: <TrendingUp size={14} className="text-green-400" />, title: '0% Interest', desc: 'No interest, no fees. Repay whenever you want.' },
                { icon: <ShieldCheck size={14} className="text-white/40" />, title: 'Stay Safe', desc: 'Keep your ratio below 65% to avoid liquidation.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white mb-0.5">{item.title}</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Transaction history */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-5">
              <p className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40">Recent Activity</p>
              {history.length === 0 ? (
                <p className="text-white/20 text-sm">No transactions yet</p>
              ) : history.map((tx, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    tx.type === 'borrow' ? 'bg-mezo-gold/10' : 'bg-green-500/10'
                  )}>
                    {tx.type === 'borrow'
                      ? <Bitcoin size={14} className="text-mezo-gold" />
                      : <RefreshCw size={14} className="text-green-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white capitalize">{tx.type}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-black text-sm', tx.type === 'borrow' ? 'text-mezo-gold' : 'text-green-400')}>
                      {tx.type === 'borrow' ? '+' : '-'}{tx.amount.toLocaleString()} MUSD
                    </p>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
