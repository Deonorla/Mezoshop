import { motion } from 'motion/react';

const STATS = [
  { value: '₿ 2.4M+', label: 'BTC Collateral Locked' },
  { value: '0%', label: 'Interest Rate' },
  { value: '< 3s', label: 'Checkout Speed' },
  { value: '420+', label: 'Brands Accepting MUSD' },
];

export default function StatsBar() {
  return (
    <section className="bg-mezo-ink py-16 px-8">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="text-center"
          >
            <p className="font-display text-3xl md:text-4xl font-black text-white mb-1">
              {stat.value}
            </p>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
