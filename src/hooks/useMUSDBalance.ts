/**
 * useMUSDBalance — thin wrapper around wagmi `useBalance` for MUSD on Mezo Testnet.
 * Returns the raw bigint balance, a human-readable formatted string, and a loading flag.
 *
 * Requirements: 7.1, 7.2
 */

import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { MUSD_TESTNET_ADDRESS, MEZO_TESTNET_CHAIN_ID } from '@/src/lib/musd';

export function useMUSDBalance(address?: string): {
  balance: bigint | undefined;
  formatted: string;
  isLoading: boolean;
} {
  const { data, isLoading } = useBalance({
    address: address as `0x${string}` | undefined,
    token: MUSD_TESTNET_ADDRESS as `0x${string}`,
    chainId: MEZO_TESTNET_CHAIN_ID,
  });

  const balance = data?.value;
  const formatted = balance !== undefined ? formatUnits(balance, 18) : '0';

  return { balance, formatted, isLoading };
}
