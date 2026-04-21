import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useAuth } from '@/src/hooks/useAuth';
import Logo from '@/src/components/Logo';

export default function NavBar({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const { isConnected } = useAccount();
  const { hasOnboarded } = useAuth();
  const { navigate } = useAppNavigation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCTA = () => {
    if (isConnected && hasOnboarded) navigate('/dashboard');
    else navigate('/auth');
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-mezo-ink/5'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center">
          <Logo
            variant={scrolled ? 'light' : 'dark'}
            size="sm"
            textClassName={scrolled ? 'text-mezo-ink' : 'text-white'}
          />
        </button>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Collections', anchor: 'collections' },
            { label: 'How It Works', anchor: 'how-it-works' },
            { label: 'MUSD', anchor: 'musd' },
          ].map(({ label, anchor }) => (
            <button
              key={label}
              onClick={() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })}
              className={cn(
                'text-[11px] font-semibold tracking-[0.15em] uppercase transition-colors hover:opacity-70',
                scrolled ? 'text-mezo-ink' : 'text-white/80'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right: bag + CTA */}
        <div className="flex items-center gap-4">
          {isConnected && hasOnboarded && (
            <button
              onClick={() => navigate('/orders')}
              className={cn(
                'transition-colors hover:opacity-70',
                scrolled ? 'text-mezo-ink' : 'text-white'
              )}
            >
              <ShoppingBag size={18} />
            </button>
          )}

          <button
            onClick={handleCTA}
            className={cn(
              'flex items-center gap-2 rounded-full text-[10px] font-black tracking-widest uppercase px-4 py-2 transition-all',
              scrolled
                ? 'bg-mezo-ink text-white hover:bg-mezo-rose'
                : 'bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/25'
            )}
          >
            {isConnected && hasOnboarded ? 'Dashboard' : 'Enter App'}
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </nav>
  );
}
