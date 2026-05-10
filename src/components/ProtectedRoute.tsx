import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAccount, useConfig, useConnect } from 'wagmi';
import { reconnect } from 'wagmi/actions';
import { useAuth } from '@/src/hooks/useAuth';
import { motion } from 'motion/react';
import Logo from '@/src/components/Logo';

const SESSION_KEY = 'mezo_session';
const CONNECTOR_KEY = 'mezo_connector_id';

export function persistSession(address: string, connectorId: string) {
  localStorage.setItem(SESSION_KEY, address);
  localStorage.setItem(CONNECTOR_KEY, connectorId);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CONNECTOR_KEY);
  // Also clear RainbowKit's latest wallet ID so it doesn't auto-reconnect
  localStorage.removeItem('rk-latest-id');
}

function getStoredSession() {
  return {
    address: localStorage.getItem(SESSION_KEY),
    connectorId: localStorage.getItem(CONNECTOR_KEY),
  };
}

function WalletLoadingScreen() {
  return (
    <div className="min-h-screen bg-mezo-ink flex flex-col items-center justify-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6"
      >
        <Logo variant="dark" size="lg" />
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-mezo-gold inline-block"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-white/30">
          Connecting...
        </p>
      </motion.div>
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, address } = useAccount();
  const { isConnected, hasOnboarded } = useAuth();
  const config = useConfig();

  const stored = useRef(getStoredSession());
  const reconnectAttempted = useRef(false);

  // Start waiting if we have a stored session
  const [waiting, setWaiting] = useState(!!stored.current.address);

  // Persist session on connect — use wagmi's recentConnectorId as the
  // canonical ID since it normalises MetaMask SDK → metaMask etc.
  useEffect(() => {
    if (status === 'connected' && address) {
      // Prefer wagmi's stored recentConnectorId over the live connector.id
      // because the live id may be "metaMaskSDK" while wagmi stores "metaMask"
      const wagmiRecent = (() => {
        try {
          const raw = localStorage.getItem('wagmi.recentConnectorId');
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();
      const connectorId =
        wagmiRecent ??
        config.state.connections.values().next().value?.connector?.id ??
        '';
      persistSession(address, connectorId);
      setWaiting(false);
    }
  }, [status, address]);

  const { connectors, connect } = useConnect();

  // On mount: trigger explicit reconnect for the stored connector
  useEffect(() => {
    if (!stored.current.address || reconnectAttempted.current) return;
    reconnectAttempted.current = true;

    const { connectorId } = stored.current;

    // Normalize connector ID — MetaMask SDK registers as "metaMaskSDK" but
    // wagmi.recentConnectorId stores it as "metaMask". Try both.
    const connector =
      (connectorId
        ? config.connectors.find(c => c.id === connectorId) ??
          config.connectors.find(c => c.id === connectorId?.replace('SDK', '')) ??
          config.connectors.find(c => c.id.toLowerCase().includes('metamask'))
        : null) ?? null;

    // If no matching connector found, or it's an orangekit connector that
    // wasn't the one the user chose, stop waiting and redirect to auth.
    if (!connector) { setWaiting(false); return; }

    // For orangekit connectors (Xverse etc), reconnect() doesn't work after
    // their post-connection disconnect event. Use connect() directly instead.
    const isOrangeKit = connector.id.startsWith('orangekit');
    if (isOrangeKit) {
      connect({ connector, chainId: 31611 }, {
        onError: () => setWaiting(false),
      });
    } else {
      reconnect(config, { connectors: [connector] }).catch(() => setWaiting(false));
    }
  }, []);

  // Keep showing loading while wagmi is actively trying to connect
  // Only stop waiting when fully settled
  useEffect(() => {
    if (status === 'connected') {
      setWaiting(false);
    } else if (status === 'disconnected') {
      // If disconnected with no stored session, stop immediately
      // If disconnected with stored session, give reconnect() 800ms to kick in
      if (!stored.current.address) {
        setWaiting(false);
      } else {
        const t = setTimeout(() => setWaiting(false), 800);
        return () => clearTimeout(t);
      }
    }
    // 'reconnecting' and 'connecting' — keep waiting, don't stop
  }, [status]);

  // Show loading while waiting OR while wagmi is actively reconnecting
  if (waiting || status === 'reconnecting' || status === 'connecting') {
    return <WalletLoadingScreen />;
  }

  if (!isConnected) return <Navigate to="/auth" replace />;
  if (!hasOnboarded) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
