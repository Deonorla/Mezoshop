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

// Use testnet in dev, mainnet in production
const isMainnet = import.meta.env.PROD;

export const wagmiConfig = getConfig({
  appName: 'Mezoshop',
  walletConnectProjectId: projectId,
  mezoNetwork: isMainnet ? 'mainnet' : 'testnet',
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

export const queryClient = new QueryClient();
export { mezoTestnet };
