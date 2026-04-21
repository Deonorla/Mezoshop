import { motion } from 'motion/react';

const TICKER_ITEMS = [
  'MUSD-BACKED CHECKOUT',
  'BTC COLLATERAL',
  'MEZO PASSPORT',
  'ZERO LIQUIDATION RISK',
  'INSTANT SETTLEMENT',
  'CONVERSATIONAL COMMERCE',
  'BITCOIN-NATIVE SHOPPING',
];

export default function MarqueeTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="overflow-hidden bg-mezo-ink py-3 border-t border-white/5">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-4 text-[9px] font-black tracking-[0.4em] uppercase text-white/40"
          >
            <span className="w-1 h-1 rounded-full bg-mezo-rose inline-block shrink-0" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
