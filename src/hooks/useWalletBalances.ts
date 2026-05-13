import { useQuery } from '@tanstack/react-query';
import { useAccount, useBalance } from 'wagmi';
import { useTokensBalances } from '@mezo-org/passport';
import { formatUnits } from 'viem';
import { MUSD_TESTNET_ADDRESS, MEZO_TESTNET_CHAIN_ID } from '@/src/lib/musd';

interface BtcBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

async function fetchNativeBtcBalance(connector: any): Promise<BtcBalance> {
  // Only for orangekit connectors (Xverse, OKX, Unisat) — they have a Bitcoin provider
  if (!connector || connector.type !== 'orangekit') {
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
  if (typeof connector.getBitcoinProvider !== 'function') {
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
  try {
    const provider = connector.getBitcoinProvider();
    return provider.getBalance();
  } catch {
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
}

export function useWalletBalances() {
  const { isConnected, connector, address } = useAccount();

  const isOrangeKit = connector?.type === 'orangekit';

  // ── Bitcoin network BTC (Xverse/orangekit only) ───────────────────────────
  const { data: nativeBtcBalance, isLoading: nativeBtcLoading } = useQuery({
    queryKey: ['btcBalance', connector?.uid],
    queryFn: () => fetchNativeBtcBalance(connector),
    enabled: isConnected && !!connector && isOrangeKit,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // ── Mezo EVM native BTC (MetaMask/EVM wallets) ────────────────────────────
  const { data: evmBtcBalance, isLoading: evmBtcLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: MEZO_TESTNET_CHAIN_ID,
    query: {
      enabled: isConnected && !isOrangeKit,
      refetchInterval: 30_000,
      staleTime: 15_000,
    },
  });

  // ── MUSD balance ──────────────────────────────────────────────────────────
  // For orangekit: use Passport SDK's useTokensBalances (reads from Mezo EVM via smart account)
  // For EVM wallets: use wagmi useBalance with the MUSD token address
  const { data: passportTokenBalances, isLoading: passportTokensLoading } = useTokensBalances({
    tokens: ['MUSD'],
  });

  const { data: evmMusdBalance, isLoading: evmMusdLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    token: MUSD_TESTNET_ADDRESS as `0x${string}`,
    chainId: MEZO_TESTNET_CHAIN_ID,
    query: {
      enabled: isConnected && !isOrangeKit,
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  // ── Derived values ────────────────────────────────────────────────────────

  // BTC display — satoshis for orangekit, wei for EVM
  const btcSatoshis = isOrangeKit ? (nativeBtcBalance?.total ?? 0) : 0;
  const btcDisplay = isOrangeKit
    ? ((btcSatoshis / 1e8).toFixed(8).replace(/\.?0+$/, '') || '0')
    : evmBtcBalance?.value !== undefined
      ? Number(formatUnits(evmBtcBalance.value, 18)).toFixed(6).replace(/\.?0+$/, '') || '0'
      : '0';

  // MUSD display
  const musdRaw = isOrangeKit ? passportTokenBalances?.MUSD : undefined;
  const musdFormatted = isOrangeKit
    ? (musdRaw ? parseFloat(musdRaw.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0')
    : evmMusdBalance?.value !== undefined
      ? Number(formatUnits(evmMusdBalance.value, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : '0';

  const isLoading = isOrangeKit
    ? (nativeBtcLoading || passportTokensLoading)
    : (evmBtcLoading || evmMusdLoading);

  return {
    // BTC
    btcSatoshis,           // satoshis (orangekit) or 0 (EVM)
    btcDisplay,            // formatted string for display
    isOrangeKit,           // true = Bitcoin wallet, false = EVM wallet

    // MUSD
    musdFormatted,         // formatted string for display
    musdRaw,               // raw Passport token data (orangekit only)

    // EVM-specific (MetaMask)
    evmBtcBalance,         // raw wagmi balance data
    evmMusdBalance,        // raw wagmi MUSD balance data

    isLoading,
  };
}
