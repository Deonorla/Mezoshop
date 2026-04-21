import { motion } from 'motion/react';
import { Diamond, ShieldCheck, Box, ExternalLink, ArrowLeft, MoreHorizontal, Filter, Grid, List as ListIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { usePortfolio } from '@/src/hooks/queries';

export default function Portfolio() {
  const { navigate } = useAppNavigation();
  const { data: assets = [], isLoading } = usePortfolio();

  return (
    <div className="min-h-screen bg-mezo-ink text-white font-sans selection:bg-mezo-gold/30">
      {/* Header */}
      <header className="px-12 py-10 flex justify-between items-center border-b border-white/5 bg-mezo-ink/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-white/5 rounded-full transition-colors group">
            <ArrowLeft className="text-white/40 group-hover:text-white transition-colors" size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tighter italic">Digital Vault</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-mezo-gold mt-1">Verified Assets & Hold</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-1 items-center bg-white/5 p-1 rounded-lg border border-white/10 shrink-0">
            <button className="p-2 bg-white/10 rounded text-mezo-gold"><Grid size={16} /></button>
            <button className="p-2 text-white/40 hover:text-white transition-colors"><ListIcon size={16} /></button>
          </div>
          <button className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-white/10 transition-all">
            <Filter size={16} className="text-mezo-rose" /> Filter Archives
          </button>
        </div>
      </header>

      {/* Hero Stats */}
      <section className="px-12 py-12">
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { label: "Total Asset Value", value: "≈ $24.8k" },
            { label: "Collection Rank", value: "#142 Global" },
            { label: "Authenticated Claims", value: "12 Assets" },
            { label: "Next Drop Access", value: "Tier 01 Gold" }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-0 duration-700">
                <Diamond size={80} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">{stat.label}</p>
              <p className="text-3xl font-display font-black tracking-tighter italic text-white group-hover:text-mezo-rose transition-colors">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Asset Grid */}
      <section className="px-12 pb-24 space-y-12">
        <div className="flex justify-between items-baseline">
          <h2 className="font-display text-4xl font-black tracking-tighter italic">Your Acquisitions</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Curated Portfolio</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-3/4 rounded-3xl bg-white/5 animate-pulse" />
                <div className="h-4 bg-white/5 rounded animate-pulse" />
              </div>
            ))
          ) : assets.length === 0 ? (
            <div className="col-span-full text-center py-24">
              <Diamond size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/30 font-black uppercase tracking-widest text-sm">No assets yet</p>
            </div>
          ) : assets.map((asset, i) => (
            <motion.div 
              key={asset.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-3/4 rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-2xl bg-neutral-800">
                <img 
                  src={asset.image} 
                  alt={asset.name} 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 grayscale-[0.2] group-hover:grayscale-0" 
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay Tags */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-mezo-ink text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={10} className="text-green-600" /> Authenticated
                  </div>
                  <div className="bg-mezo-gold px-3 py-1.5 rounded-xl text-white text-[8px] font-black uppercase tracking-widest">
                    {asset.rarity}
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-10 h-10 rounded-2xl bg-white text-mezo-ink flex items-center justify-center hover:bg-mezo-rose hover:text-white shadow-xl shadow-black/40">
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 px-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-[0.2em] text-mezo-gold uppercase italic">{asset.id}</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", 
                    asset.status === 'On Loan' ? 'border-mezo-rose text-mezo-rose' : 'border-white/20 text-white/40'
                  )}>
                    {asset.status}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight text-white/90 group-hover:text-white transition-colors italic">{asset.name}</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black flex items-center gap-2">
                  <Box size={10} /> {asset.type}
                </p>
                
                <div className="pt-4 flex gap-2">
                  <button className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all">Claim NFT</button>
                  <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"><MoreHorizontal size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Floating Action */}
      <div className="fixed bottom-12 right-12 z-50">
        <button className="flex items-center gap-4 bg-mezo-rose px-8 py-5 rounded-full shadow-2xl shadow-mezo-rose/20 text-white font-sans text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all outline outline-offset-4 outline-transparent hover:outline-mezo-rose/20 italic">
          <Diamond size={18} />
          Mint New Asset
        </button>
      </div>
    </div>
  );
}
