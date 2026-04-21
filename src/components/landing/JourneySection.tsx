import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

const STEPS = [
  {
    num: '01',
    title: 'Discover',
    desc: 'Browse curated collections or chat with the AI stylist to find your perfect piece.',
  },
  {
    num: '02',
    title: 'Borrow MUSD',
    desc: 'Use your BTC as collateral to instantly borrow MUSD. Zero interest, zero selling.',
  },
  {
    num: '03',
    title: 'Receive & Own',
    desc: 'Your item ships to your door. The digital twin is minted to your Mezo Passport.',
  },
];

export default function JourneySection() {
  return (
    <section id="musd" className="bg-mezo-rose/20 py-32 px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl md:text-5xl font-black text-mezo-ink leading-tight">
            Your Journey to
            <br />
            Bitcoin Commerce
          </h2>
        </motion.div>

        <div className="space-y-12">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                'flex items-start gap-8',
                i % 2 !== 0 && 'md:flex-row-reverse md:text-right'
              )}
            >
              <span className="font-display text-6xl font-black text-mezo-rose-dark/20 leading-none shrink-0 w-20 text-center">
                {step.num}
              </span>
              <div className="pt-2">
                <h3 className="font-display text-2xl font-black text-mezo-ink mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-mezo-ink/60 leading-relaxed max-w-md">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
