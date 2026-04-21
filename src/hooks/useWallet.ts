import { useAccount, useDisconnect, useBalance } from 'wagmi';

export const useWallet = () => {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();

  // BTC native balance on Mezo
  const { data: balance } = useBalance({ address });

  return {
    address,
    isConnected,
    isConnecting,
    disconnect,
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
    btcBalance: balance ? `${Number(balance.formatted).toFixed(6)} ${balance.symbol}` : null,
  };
};
