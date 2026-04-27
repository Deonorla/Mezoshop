import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useTokensBalances } from '@mezo-org/passport';

interface BtcBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

async function fetchBtcBalance(connector: any): Promise<BtcBalance> {
  if (!connector || typeof connector.getBitcoinProvider !== 'function') {
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
  const provider = connector.getBitcoinProvider();
  return provider.getBalance();
}

export function useWalletBalances() {
  const { isConnected, connector } = useAccount();

  // BTC balance via TanStack Query — cached, deduped, auto-refetches every 30s
  const { data: btcBalance, isLoading: btcLoading } = useQuery({
    queryKey: ['btcBalance', connector?.uid],
    queryFn: () => fetchBtcBalance(connector),
    enabled: isConnected && !!connector,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // MUSD on-chain balance via passport (already TanStack Query internally)
  const { data: tokenBalances, isLoading: tokensLoading } = useTokensBalances({
    tokens: ['MUSD'],
  });

  const btcSatoshis = btcBalance?.total ?? 0;
  const btcDisplay = (btcSatoshis / 1e8).toFixed(8).replace(/\.?0+$/, '') || '0';

  const musdRaw = tokenBalances?.MUSD;
  const musdFormatted = musdRaw
    ? parseFloat(musdRaw.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0';

  return {
    btcSatoshis,
    btcDisplay,
    musdFormatted,
    musdRaw,
    isLoading: btcLoading || tokensLoading,
  };
}
