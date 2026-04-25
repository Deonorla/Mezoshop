import { useAccount, useSwitchChain } from 'wagmi';
import { AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { MEZO_TESTNET_CHAIN_ID } from '@/src/lib/musd';

/**
 * WrongNetworkBanner
 *
 * Renders a sticky warning banner when the connected wallet is on a network
 * other than Mezo Testnet (chainId 31611). Offers a one-click chain switch
 * via wagmi `useSwitchChain`. Automatically hides once the user is on the
 * correct network.
 *
 * Requirements: 8.1, 8.2, 8.3
 */
export default function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  // Only render when wallet is connected AND on the wrong network
  if (!isConnected || chainId === MEZO_TESTNET_CHAIN_ID) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-mezo-rose/10 border-b border-mezo-rose/30 px-6 py-3 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle
          size={16}
          className="text-mezo-rose shrink-0"
          aria-hidden="true"
        />
        <p className="text-sm text-white/80 truncate">
          You&apos;re on the wrong network.{' '}
          <span className="text-white font-semibold">
            Switch to Mezo Testnet to continue.
          </span>
        </p>
      </div>

      <button
        onClick={() => switchChain({ chainId: MEZO_TESTNET_CHAIN_ID })}
        disabled={isPending}
        className="shrink-0 flex items-center gap-2 bg-mezo-gold hover:bg-white hover:text-mezo-ink disabled:opacity-60 disabled:cursor-not-allowed text-mezo-ink px-4 py-1.5 rounded-xl text-[10px] font-black tracking-[0.25em] uppercase transition-all"
        aria-label="Switch to Mezo Testnet"
      >
        {isPending ? (
          <>
            <span
              className="w-3 h-3 border-2 border-mezo-ink/30 border-t-mezo-ink rounded-full animate-spin"
              aria-hidden="true"
            />
            Switching…
          </>
        ) : (
          <>
            <ArrowRightLeft size={12} aria-hidden="true" />
            Switch to Mezo Testnet
          </>
        )}
      </button>
    </div>
  );
}
