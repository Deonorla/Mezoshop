import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Bitcoin, Coins, ShoppingBag, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onNavigate: (page: string) => void;
}

const STEPS = [
  {
    num: '01',
    icon: Bitcoin,
    title: 'Deposit BTC',
    desc: 'Lock your Bitcoin as collateral on Mezo. Your BTC stays yours.',
  },
  {
    num: '02',
    icon: Coins,
    title: 'Borrow MUSD',
    desc: 'Instantly borrow MUSD against your BTC at 0% interest.',
  },
  {
    num: '03',
    icon: ShoppingBag,
    title: 'Shop & Checkout',
    desc: 'Browse MezoShop and pay with MUSD. No bank, no card.',
  },
];

export default function HowItWorks({ onNavigate }: HowItWorksProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '0px 0px -80px 0px' });

  return (
    <section id="how-it-works" className="bg-mezo-bg py-32 px-8">
      <div ref={sectionRef} className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-mezo-gold mb-4">
            THE MEZO WAY
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-black text-mezo-ink leading-tight">
            Shop with Bitcoin.
            <br />
            No selling required.
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-mezo-ink/10" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.2 + i * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Faded step number */}
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-display text-8xl font-black text-mezo-ink/5 select-none leading-none pointer-events-none">
                {step.num}
              </span>
              {/* Icon circle */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-mezo-cream-dark flex items-center justify-center mb-6 border border-mezo-ink/8">
                <step.icon size={28} className="text-mezo-ink/60" />
              </div>
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-mezo-gold mb-2">
                {step.num}
              </p>
              <h3 className="font-display text-xl font-black text-mezo-ink mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-mezo-ink/60 leading-relaxed max-w-56">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex justify-center mt-16"
        >
          <button
            onClick={() => onNavigate('onboarding')}
            className="flex items-center gap-2 bg-mezo-ink text-white text-[11px] font-black tracking-[0.2em] uppercase px-8 py-4 hover:bg-mezo-rose-dark transition-colors"
          >
            Start Shopping <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
