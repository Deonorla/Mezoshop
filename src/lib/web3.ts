import {
  getConfig,
  mezoTestnet,
  xverseWalletMezoMainnet,
  unisatWalletMezoMainnet,
  okxWalletMezoMainnet,
  xverseWalletMezoTestnet,
  unisatWalletMezoTestnet,
  okxWalletMezoTestnet,
} from '@mezo-org/passport';
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { QueryClient } from '@tanstack/react-query';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '';
// Force testnet — change to 'mainnet' when ready for production
const mezoNetwork = (import.meta.env.VITE_MEZO_NETWORK as 'mainnet' | 'testnet') ?? 'testnet';

export const wagmiConfig = getConfig({
  appName: 'Mezoshop',
  walletConnectProjectId: projectId,
  mezoNetwork,
  reconnectOnMount: false,
  wallets: [
    {
      groupName: 'Bitcoin',
      wallets: mezoNetwork === 'mainnet'
        ? [xverseWalletMezoMainnet, unisatWalletMezoMainnet, okxWalletMezoMainnet]
        : [xverseWalletMezoTestnet, unisatWalletMezoTestnet, okxWalletMezoTestnet],
    },
    {
      groupName: 'Ethereum',
      wallets: [
        metaMaskWallet,
        ({ projectId: pid }: { projectId: string }) => walletConnectWallet({ projectId: pid }),
      ],
    },
  ],
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cache alive for 5 minutes after a component unmounts.
      // This prevents skeleton flashes when navigating back to a page
      // that already fetched its data.
      gcTime: 5 * 60 * 1000,
      // Don't refetch on window focus — reduces unnecessary network calls
      refetchOnWindowFocus: false,
    },
  },
});
export { mezoTestnet };
