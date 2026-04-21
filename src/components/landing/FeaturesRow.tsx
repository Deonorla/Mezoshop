import { motion } from 'motion/react';
import { Star, Shield, Zap, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Star,
    title: 'Bitcoin Collateral',
    desc: 'Lock your BTC and unlock purchasing power. Your Bitcoin never leaves the Mezo protocol.',
    link: 'Learn More',
  },
  {
    icon: Shield,
    title: 'MUSD Stability',
    desc: 'MUSD is a Bitcoin-backed stablecoin. Shop with confidence knowing your purchasing power is stable.',
    link: 'View MUSD',
  },
  {
    icon: Zap,
    title: 'Instant Checkout',
    desc: "No bank approvals, no credit checks. If you have BTC collateral, you can shop. It's that simple.",
    link: 'Start Now',
  },
];

export default function FeaturesRow() {
  return (
    <section className="bg-mezo-cream-light py-24 px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {FEATURES.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="bg-white p-8 rounded-sm border border-mezo-ink/5 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-full bg-mezo-cream-dark flex items-center justify-center mb-6">
              <card.icon size={18} className="text-mezo-ink/60" />
            </div>
            <h3 className="font-display text-lg font-black text-mezo-ink mb-3">
              {card.title}
            </h3>
            <p className="text-sm text-mezo-ink/60 leading-relaxed mb-5">
              {card.desc}
            </p>
            <button className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em] uppercase text-mezo-gold hover:text-mezo-rose-dark transition-colors">
              {card.link} <ArrowRight size={11} />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
