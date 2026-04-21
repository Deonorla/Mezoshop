import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ArrowLeft, ShieldCheck, Wallet, Zap, Bitcoin } from 'lucide-react';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useAuth } from '@/src/hooks/useAuth';
import Logo from '@/src/components/Logo';

export default function Auth() {
  const { goToLanding, goToOnboarding, goToDashboard } = useAppNavigation();
  const { isConnected, hasOnboarded } = useAuth();
  const { openConnectModal } = useConnectModal();

  // Redirect once connected — skip onboarding if already done
  useEffect(() => {
    if (isConnected) {
      if (hasOnboarded) goToDashboard();
      else goToOnboarding();
    }
  }, [isConnected, hasOnboarded]);

  return (
    <div className="flex h-screen bg-mezo-bg overflow-hidden">
      {/* Left Side - Visual */}
      <div className="hidden lg:block lg:w-1/2 relative bg-neutral-900">
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-70"
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=3870&auto=format&fit=crop"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-linear-to-t from-mezo-ink via-transparent to-transparent opacity-60" />
        <div className="absolute bottom-16 left-16 z-10 max-w-sm">
          <span className="font-sans text-[10px] tracking-[0.4em] uppercase text-mezo-gold font-black mb-4 block">
            The Collective
          </span>
          <h2 className="font-display text-4xl font-bold tracking-tight text-white mb-6">
            Access the Inner Circle of Digital Luxury.
          </h2>
          <p className="text-white/60 font-sans text-xs leading-relaxed tracking-wide font-medium">
            Your Bitcoin wallet is your identity. Connect to manage your physical wardrobe and digital vault in one place.
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-24 bg-white relative">
        <button
          onClick={goToLanding}
          className="absolute top-12 left-12 flex items-center gap-3 text-mezo-ink/40 hover:text-mezo-ink transition-colors font-sans text-[10px] tracking-[0.3em] uppercase font-bold group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back 
        </button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="w-full max-w-sm mx-auto space-y-10"
        >
          {/* Header */}
          <div className="space-y-4">
            <Logo variant="light" size="md" className="mb-2" />
            <h1 className="font-display text-5xl font-black tracking-tighter text-mezo-ink">
              Connect
            </h1>
            <p className="font-sans text-sm text-mezo-ink/40 uppercase tracking-[0.15em] font-black">
              Your Bitcoin wallet is your key.
            </p>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Bitcoin size={14} className="text-mezo-gold" />, label: 'BTC Native' },
              { icon: <ShieldCheck size={14} className="text-green-500" />, label: 'Non-Custodial' },
              { icon: <Zap size={14} className="text-mezo-rose" />, label: '0% Interest' },
            ].map((b) => (
              <div
                key={b.label}
                className="flex flex-col items-center gap-2 bg-mezo-bg border border-mezo-ink/5 rounded-2xl py-4"
              >
                {b.icon}
                <span className="text-[8px] font-black tracking-widest uppercase text-mezo-ink/40">
                  {b.label}
                </span>
              </div>
            ))}
          </div>

          {/* Custom connect button */}
          <div className="flex flex-col items-stretch gap-4">
            <p className="text-[9px] font-black tracking-[0.3em] uppercase text-mezo-ink/30 text-center">
              Supported wallets
            </p>
            <button
              onClick={openConnectModal}
              className="w-full flex items-center justify-center gap-3 bg-mezo-ink text-white py-5 font-sans text-[11px] tracking-[0.4em] uppercase font-black rounded-sm hover:bg-mezo-rose transition-colors"
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          </div>

          <p className="text-center font-sans text-[9px] tracking-[0.2em] uppercase font-black text-mezo-ink/20 pt-4">
            Powered by{' '}
            <span className="text-mezo-gold">Mezo Passport</span>
            {' '}· Bitcoin-backed MUSD
          </p>
        </motion.div>
      </div>
    </div>
  );
}
