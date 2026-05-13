import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bitcoin, ShieldCheck, Zap, TrendingUp, RefreshCw, AlertTriangle, ChevronUp, ChevronDown, Wallet, ExternalLink, ArrowRight } from 'lucide-react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatUnits, parseEther } from 'viem';
import { cn } from '@/src/lib/utils';
import { MUSD_TESTNET_ADDRESS, MEZO_TESTNET_CHAIN_ID } from '@/src/lib/musd';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useBorrowPosition, useBorrowHistory, useBorrow, useRepay, keys } from '@/src/hooks/queries';
import { useWalletBalances } from '@/src/hooks/useWalletBalances';
import { backendClient } from '@/src/lib/backendClient';

const LENDING_CONTRACT = '0xd00867f1Fe750C4aE5391949c937Dbb5eD5CC976' as const;
const DEPOSIT_ABI = [{
  name: 'deposit',
  type: 'function',
  stateMutability: 'payable',
  inputs: [],
  outputs: [],
}] as const;

export default function Borrow() {
  const { navigate } = useAppNavigation();
  const [borrowAmount, setBorrowAmount] = useState(0);
  const [tab, setTab] = useState<'lock' | 'borrow' | 'repay'>('lock');
  const [lockAmount, setLockAmount] = useState(0);
  const [lockInputRaw, setLockInputRaw] = useState('');

  const { address, connector } = useAccount();

  // Detect wallet type — orangekit = Bitcoin wallet (Xverse/OKX/Unisat), otherwise EVM (MetaMask)
  const isOrangeKit = connector?.type === 'orangekit';

  // Native Bitcoin balance (Xverse users) — satoshis from Bitcoin network
  const { btcSatoshis, btcDisplay: nativeBtcDisplay, isLoading: nativeBtcLoading } = useWalletBalances();
  const nativeBtcAmount = btcSatoshis / 1e8;

  // Mezo EVM native BTC balance (MetaMask users) — wei on chain 31611
  const { data: evmBtcBalance, isLoading: evmBtcLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: MEZO_TESTNET_CHAIN_ID,
    query: { refetchInterval: 15_000, staleTime: 10_000, enabled: !isOrangeKit },
  });
  const evmBtcAmount = evmBtcBalance?.value !== undefined
    ? Number(formatUnits(evmBtcBalance.value, 18))
    : 0;
  const evmBtcDisplay = evmBtcBalance?.value !== undefined
    ? Number(formatUnits(evmBtcBalance.value, 18)).toFixed(6).replace(/\.?0+$/, '')
    : '0';
  // Only show loading spinner on first fetch, not background refetches
  const showEvmBtcLoading = evmBtcLoading && evmBtcBalance === undefined;

  // For the deposit UI: Xverse users need to bridge first (no EVM BTC yet),
  // MetaMask users use their EVM BTC directly
  const btcAvailable = isOrangeKit
    ? 0 // Xverse users must bridge first — can't deposit native BTC directly
    : Math.max(0, evmBtcAmount - 0.001); // MetaMask: reserve 0.001 for gas

  const btcBalanceLoading = isOrangeKit ? nativeBtcLoading : evmBtcLoading;

  // Deposit (Lock BTC) contract interaction
  const { writeContract, data: depositTxHash, isPending: depositPending, reset: resetDeposit } = useWriteContract();
  const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositTxHash });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (depositSuccess && depositTxHash && address) {
      // Record the lock transaction in the backend
      backendClient.recordLock(address, depositTxHash, lockAmount).catch(() => {
        // non-fatal — position will still update
      });
      queryClient.invalidateQueries({ queryKey: keys.borrowPosition(address) });
      queryClient.refetchQueries({ queryKey: keys.borrowHistory(address) });
      setTimeout(() => { setTab('borrow'); resetDeposit(); setLockAmount(0); setLockInputRaw(''); }, 1500);
    }
  }, [depositSuccess]);

  function handleDeposit() {
    if (!lockAmount || lockAmount <= 0 || !address) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (writeContract as any)({
      address: LENDING_CONTRACT,
      abi: DEPOSIT_ABI,
      functionName: 'deposit',
      value: parseEther(String(lockAmount)),
      chainId: 31611,
    });
  }

  // Real MUSD balance with 10s refetch interval (Requirement 7.3)
  const { data: musdBalanceData, isLoading: musdBalanceLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    token: MUSD_TESTNET_ADDRESS as `0x${string}`,
    chainId: MEZO_TESTNET_CHAIN_ID,
    query: {
      refetchInterval: 10_000,
      staleTime: 8_000,
    },
  });

  const musdFormatted = musdBalanceData?.value !== undefined
    ? Number(formatUnits(musdBalanceData.value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—';

  const { data: position, isLoading: positionLoading, isFetching: positionFetching, status: positionStatus } = useBorrowPosition();
  const { data: history = [] } = useBorrowHistory();

  // Only show skeleton on the very first load — not on background refetches or navigation
  // status === 'pending' means no cached data exists yet (true first-ever load only)
  const showPositionSkeleton = positionStatus === 'pending';
  const borrowMutation = useBorrow();
  const repayMutation = useRepay();

  const btcLocked = position?.btcLocked ?? 0;
  const btcPriceUSD = position?.btcPriceUSD ?? 0;
  const collateralValueUSD = position?.collateralValueUSD ?? 0;
  const totalBorrowable = position?.totalBorrowable ?? 0;
  const alreadyBorrowed = position?.alreadyBorrowed ?? 0;
  const available = position?.available ?? 0;

  // Format BTC with up to 8 decimal places, trimming trailing zeros
  const btcLockedDisplay = btcLocked > 0
    ? btcLocked.toFixed(8).replace(/\.?0+$/, '')
    : '0';

  const musdUnlockable = lockAmount > 0 && btcPriceUSD > 0
    ? Math.floor(lockAmount * btcPriceUSD * 0.6)
    : 0;

  const newTotal = alreadyBorrowed + (tab === 'borrow' ? borrowAmount : -borrowAmount);
  const collateralRatio = collateralValueUSD > 0 ? Math.round((newTotal / collateralValueUSD) * 100) : 0;
  const healthColor = collateralRatio < 50 ? 'text-green-400' : collateralRatio < 65 ? 'text-mezo-gold' : 'text-red-400';
  const barColor = collateralRatio < 50 ? 'bg-green-500' : collateralRatio < 65 ? 'bg-mezo-gold' : 'bg-red-500';

  const txPending = borrowMutation.isPending || repayMutation.isPending;
  const txDone = borrowMutation.isSuccess || repayMutation.isSuccess;
  const txError =
    (borrowMutation.error as Error | null)?.message ??
    (repayMutation.error as Error | null)?.message ??
    null;

  function handleTx() {
    if (tab === 'borrow') {
      borrowMutation.mutate(borrowAmount);
    } else {
      repayMutation.mutate(borrowAmount);
    }
  }

  const STATS = [
    { label: 'BTC Locked', value: `${btcLockedDisplay} BTC`, sub: `≈ $${collateralValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    { label: 'MUSD Borrowed', value: `${alreadyBorrowed.toLocaleString()}`, sub: 'of ' + totalBorrowable.toLocaleString() + ' max' },
    { label: 'Available to Borrow', value: `${available.toLocaleString()}`, sub: 'MUSD remaining' },
    { label: 'Interest Rate', value: '0%', sub: 'Forever free' },
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
        {showPositionSkeleton ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-32 rounded-3xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

            {/* Real MUSD Balance stat card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: STATS.length * 0.08 }}
              className="bg-mezo-gold/10 border border-mezo-gold/30 p-6 rounded-3xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-3 opacity-[0.08] scale-150 group-hover:scale-125 transition-transform duration-700">
                <Wallet size={60} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-mezo-gold/60 mb-2">MUSD Balance</p>
              <p className="text-2xl font-display font-black tracking-tighter text-mezo-gold group-hover:text-white transition-colors">
                {musdBalanceLoading ? '...' : musdFormatted}
              </p>
              <p className="text-[10px] text-white/30 mt-1">On-chain · live</p>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Left: Borrow / Repay form ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Tab switcher */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 w-fit">
              {(['lock', 'borrow', 'repay'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setBorrowAmount(0); }}
                  className={cn(
                    'px-8 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all',
                    tab === t ? 'bg-white text-mezo-ink shadow-lg' : 'text-white/40 hover:text-white'
                  )}
                >
                  {t === 'lock' ? 'Lock BTC' : t === 'borrow' ? 'Borrow' : 'Repay'}
                </button>
              ))}
            </div>

            {/* ── Lock BTC tab ── */}
            {tab === 'lock' && (
              <>
                {/* ── Xverse: Bridge required ── */}
                {isOrangeKit && (
                  <>
                    {/* Native BTC balance */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-mezo-gold/10 flex items-center justify-center shrink-0">
                        <Bitcoin size={18} className="text-mezo-gold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-0.5">Your Bitcoin Balance</p>
                        <p className="text-xl font-display font-black tracking-tighter text-white">
                          {nativeBtcLoading ? '...' : nativeBtcDisplay} <span className="text-mezo-gold text-sm">BTC</span>
                        </p>
                        <p className="text-[9px] text-white/30 mt-0.5">Native Bitcoin · not yet on Mezo EVM</p>
                      </div>
                    </div>

                    {/* Bridge step */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-mezo-gold flex items-center justify-center shrink-0 text-mezo-ink font-black text-xs">1</div>
                        <p className="text-sm font-black text-white">Bridge BTC to Mezo</p>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed pl-10">
                        Your Bitcoin is on the Bitcoin network. To use it as collateral on MezoShop, you need to bridge it to Mezo EVM first. This is a one-time step.
                      </p>
                      <a
                        href="https://testnet.mezo.org/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-10 flex items-center gap-2 w-fit bg-mezo-gold text-mezo-ink text-[10px] font-black tracking-[0.2em] uppercase px-5 py-3 rounded-xl hover:bg-white transition-colors"
                      >
                        Bridge on Mezo <ExternalLink size={12} />
                      </a>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white/40 font-black text-xs">2</div>
                        <p className="text-sm font-black text-white/40">Come back and Lock BTC</p>
                      </div>
                      <p className="text-[11px] text-white/30 leading-relaxed pl-10">
                        After bridging, your BTC will appear on Mezo EVM. Return here and lock it as collateral to start borrowing MUSD.
                      </p>
                      <div className="ml-10 flex items-center gap-2 text-[10px] text-white/20 font-black uppercase tracking-widest">
                        <ArrowRight size={12} /> Then borrow MUSD · shop · repay
                      </div>
                    </div>

                    {/* After bridge: check if they now have EVM BTC */}
                    {nativeBtcAmount === 0 && (
                      <div className="flex items-start gap-3 bg-mezo-gold/10 border border-mezo-gold/30 rounded-2xl p-5">
                        <AlertTriangle size={16} className="text-mezo-gold shrink-0 mt-0.5" />
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          No Bitcoin detected in your Xverse wallet. Make sure you're on testnet and have testnet BTC.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* ── MetaMask: Direct deposit ── */}
                {!isOrangeKit && (
                  <>
                    {/* EVM BTC balance */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-mezo-gold/10 flex items-center justify-center shrink-0">
                        <Bitcoin size={18} className="text-mezo-gold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-0.5">Available BTC · Mezo EVM</p>
                        <p className="text-xl font-display font-black tracking-tighter text-white">
                          {showEvmBtcLoading ? '...' : evmBtcDisplay} <span className="text-mezo-gold text-sm">BTC</span>
                        </p>
                        <p className="text-[9px] text-white/30 mt-0.5">0.001 BTC reserved for gas</p>
                      </div>
                    </div>

                    {/* No EVM BTC warning — only show after confirmed first load */}
                    {!showEvmBtcLoading && evmBtcAmount === 0 && (
                      <div className="flex items-start gap-3 bg-mezo-gold/10 border border-mezo-gold/30 rounded-2xl p-5">
                        <AlertTriangle size={16} className="text-mezo-gold shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[11px] text-white/60 leading-relaxed">
                            No BTC on Mezo EVM. Get testnet BTC from the faucet or bridge from Bitcoin.
                          </p>
                          <a
                            href="https://faucet.test.mezo.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-mezo-gold font-black uppercase tracking-widest hover:text-white transition-colors"
                          >
                            Get from faucet <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Amount input */}
                    {evmBtcAmount > 0 && (
                      <>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">Amount to Lock</p>
                            <button
                              onClick={() => {
                                setLockAmount(btcAvailable);
                                setLockInputRaw(String(btcAvailable));
                              }}
                              className="text-[9px] font-black tracking-widest uppercase text-mezo-gold hover:text-white transition-colors"
                            >
                              Max
                            </button>
                          </div>

                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={lockInputRaw}
                                placeholder="0"
                                onChange={e => {
                                  const raw = e.target.value;
                                  // Allow empty string, digits, and a single decimal point
                                  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                    setLockInputRaw(raw);
                                    const val = parseFloat(raw);
                                    setLockAmount(isNaN(val) ? 0 : Math.max(0, val));
                                  }
                                }}
                                className="w-full bg-transparent font-display text-5xl font-black text-white focus:outline-none tracking-tighter placeholder:text-white/20"
                              />
                              <p className="text-mezo-gold font-black text-sm mt-1">BTC</p>
                            </div>
                            <div className="flex flex-col gap-1 pb-6">
                              <button
                                onClick={() => {
                                  const next = Math.min(btcAvailable, Math.round((lockAmount + 0.001) * 1e8) / 1e8);
                                  setLockAmount(next);
                                  setLockInputRaw(String(next));
                                }}
                                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  const next = Math.max(0, Math.round((lockAmount - 0.001) * 1e8) / 1e8);
                                  setLockAmount(next);
                                  setLockInputRaw(next === 0 ? '' : String(next));
                                }}
                                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Over-balance warning */}
                        {lockAmount > btcAvailable && (
                          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            <AlertTriangle size={14} className="text-red-400 shrink-0" />
                            <p className="text-[10px] text-red-300">
                              Exceeds available balance. Max: {btcAvailable.toFixed(6)} BTC
                            </p>
                          </div>
                        )}

                        {/* Preview */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">Preview</p>
                          <div className="flex justify-between items-center">
                            <p className="text-[11px] text-white/50">You will be able to borrow</p>
                            <p className="font-black text-mezo-gold">
                              {musdUnlockable > 0 ? musdUnlockable.toLocaleString() : '—'} MUSD
                            </p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[11px] text-white/50">At current BTC price</p>
                            <p className="font-black text-white/70">
                              {btcPriceUSD > 0 ? `$${btcPriceUSD.toLocaleString()}` : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Lock BTC CTA */}
                        <AnimatePresence mode="wait">
                          {depositSuccess ? (
                            <motion.div
                              key="deposit-done"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="w-full flex items-center justify-center gap-3 bg-green-500/20 border border-green-500/30 py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase text-green-400"
                            >
                              <ShieldCheck size={16} />
                              ✓ BTC Locked — switching to Borrow...
                            </motion.div>
                          ) : (
                            <motion.button
                              key="deposit-cta"
                              onClick={handleDeposit}
                              disabled={!address || depositPending || depositConfirming || lockAmount <= 0 || lockAmount > btcAvailable}
                              className="w-full flex items-center justify-center gap-3 bg-mezo-gold py-5 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-mezo-gold/20 disabled:opacity-40"
                            >
                              {depositPending || depositConfirming ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                  />
                                  {depositConfirming ? 'Confirming...' : 'Locking...'}
                                </>
                              ) : (
                                <>
                                  <Bitcoin size={16} />
                                  Lock {lockAmount > 0 ? `${lockAmount} ` : ''}BTC as Collateral
                                </>
                              )}
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── Borrow / Repay tab content ── */}
            {tab !== 'lock' && (
            <>
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

              {/* Big number input — free typing, validated on submit */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    min={0}
                    value={borrowAmount || ''}
                    placeholder="0"
                    onChange={e => {
                      const val = Number(e.target.value);
                      setBorrowAmount(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-full bg-transparent font-display text-5xl font-black text-white focus:outline-none tracking-tighter placeholder:text-white/20"
                  />
                  <p className="text-mezo-gold font-black text-sm mt-1">MUSD</p>
                </div>
                <div className="flex flex-col gap-1 pb-6">
                  <button
                    onClick={() => setBorrowAmount(v => v + 100)}
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

              {/* Slider — only useful when there's an available amount */}
              <input
                type="range"
                min={0}
                max={Math.max(tab === 'borrow' ? available : alreadyBorrowed, borrowAmount, 1)}
                value={borrowAmount}
                onChange={e => setBorrowAmount(Number(e.target.value))}
                className="w-full accent-mezo-gold"
              />
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/20">
                <span>0</span>
                <span>{(tab === 'borrow' ? available : alreadyBorrowed).toLocaleString()} MUSD max</span>
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

            {/* Exceeds limit warning */}
            {tab === 'borrow' && borrowAmount > available && available > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <p className="text-[10px] text-red-300">Amount exceeds your available limit of {available.toLocaleString()} MUSD</p>
              </div>
            )}

            {/* Transaction error banner */}
            {txError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4"
              >
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-red-300 leading-relaxed">{txError}</p>
                </div>
                <button
                  onClick={() => {
                    borrowMutation.reset();
                    repayMutation.reset();
                  }}
                  className="text-red-400/60 hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-widest shrink-0"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

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
                  disabled={!address || txPending || borrowAmount === 0 || (tab === 'borrow' && borrowAmount > available) || (tab === 'repay' && borrowAmount > alreadyBorrowed) || collateralRatio > 75}
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
            </>
            )}
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
                    tx.type === 'borrow' ? 'bg-mezo-gold/10' :
                    tx.type === 'lock' ? 'bg-blue-500/10' :
                    'bg-green-500/10'
                  )}>
                    {tx.type === 'borrow'
                      ? <Bitcoin size={14} className="text-mezo-gold" />
                      : tx.type === 'lock'
                      ? <ShieldCheck size={14} className="text-blue-400" />
                      : <RefreshCw size={14} className="text-green-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white capitalize">{tx.type === 'lock' ? 'Lock BTC' : tx.type}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-black text-sm',
                      tx.type === 'borrow' ? 'text-mezo-gold' :
                      tx.type === 'lock' ? 'text-blue-400' :
                      'text-green-400'
                    )}>
                      {tx.type === 'borrow' ? '+' : tx.type === 'lock' ? '' : '-'}
                      {tx.type === 'lock'
                        ? `${tx.amount} BTC`
                        : `${tx.amount.toLocaleString()} MUSD`}
                    </p>
                    {tx.txHash && (
                      <a
                        href={`https://explorer.test.mezo.org/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[8px] text-mezo-gold/60 hover:text-mezo-gold transition-colors uppercase tracking-widest font-black"
                      >
                        View tx →
                      </a>
                    )}
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
