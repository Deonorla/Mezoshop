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
const isMainnet = import.meta.env.PROD;

export const wagmiConfig = getConfig({
  appName: 'Mezoshop',
  walletConnectProjectId: projectId,
  mezoNetwork: isMainnet ? 'mainnet' : 'testnet',
  // Disable wagmi's built-in reconnect-on-mount — ProtectedRoute handles
  // reconnection manually so only the stored connector is reconnected,
  // preventing Xverse from opening when MetaMask is the active wallet.
  reconnectOnMount: false,
  wallets: [
    {
      groupName: 'Bitcoin',
      wallets: isMainnet
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
