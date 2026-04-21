import { Bitcoin } from 'lucide-react';

const FOOTER_LINKS = [
  {
    heading: 'Shop',
    links: ['Men', 'Women', 'Crypto Goods', 'New Arrivals'],
  },
  {
    heading: 'Protocol',
    links: ['How MUSD Works', 'Mezo Passport', 'BTC Collateral', 'Security'],
  },
  {
    heading: 'Company',
    links: ['Journal', 'Privacy', 'Sustainability', 'Stores'],
  },
];

export default function FooterSection() {
  return (
    <footer className="bg-neutral-950 py-24 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Top row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 mb-16 pb-16 border-b border-white/5">
          {/* Logo + tagline */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                <Bitcoin size={14} className="text-mezo-rose" />
              </span>
              <span className="font-display text-sm font-black tracking-[0.15em] uppercase text-white">
                MezoShop
              </span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              Bitcoin-powered commerce for the modern collector.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-12">
            {FOOTER_LINKS.map((col) => (
              <div key={col.heading}>
                <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mb-4">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <button className="text-xs text-white/50 hover:text-white transition-colors">
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 pb-16 border-b border-white/5">
          <div>
            <p className="font-display text-xl font-black text-white mb-1">
              Stay ahead of the drop.
            </p>
            <p className="text-xs text-white/30">
              New collections, protocol updates, and exclusive access.
            </p>
          </div>
          <div className="flex max-w-sm w-full">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 px-4 py-3 outline-none focus:border-white/20 transition-colors"
            />
            <button className="bg-mezo-rose text-mezo-ink text-[10px] font-black tracking-[0.2em] uppercase px-5 py-3 hover:bg-mezo-rose/80 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-white/20">
            © {new Date().getFullYear()} MezoShop. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <Bitcoin size={11} className="text-mezo-rose/60" />
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/20">
              Powered by Mezo Protocol
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
