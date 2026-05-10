import './buffer-shim.js'; // must be first — patches Buffer before crypto chain loads
import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClientProvider } from '@tanstack/react-query';
import { PassportProvider } from '@mezo-org/passport';
import { wagmiConfig, queryClient, mezoTestnet } from './lib/web3';
import { router } from './router.tsx';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

// Eagerly call setup() only on the previously connected connector
// so getChainId() works synchronously when RainbowKit calls it before connect().
// Calling setup() on ALL connectors triggers wallet popups (e.g. Xverse)
// even when the user connected with a different wallet (e.g. MetaMask).
const storedConnectorId = localStorage.getItem('mezo_connector_id');
wagmiConfig.connectors.forEach((connector: any) => {
  const isStored = storedConnectorId
    ? connector.id === storedConnectorId
    : false;
  // Always setup non-Bitcoin connectors (MetaMask, WalletConnect) — they don't open popups
  const isOrangeKit = connector.id?.startsWith('orangekit');
  if (!isOrangeKit || isStored) {
    if (typeof connector.setup === 'function') {
      connector.setup().catch(() => {});
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PassportProvider environment="testnet">
          <RainbowKitProvider initialChain={mezoTestnet}>
            <RouterProvider router={router} />
          </RainbowKitProvider>
        </PassportProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
