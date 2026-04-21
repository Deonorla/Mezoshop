import { motion } from 'motion/react';
import { Package, Truck, CheckCircle2, ArrowLeft, MoreVertical, CreditCard, Wallet, RotateCcw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useOrders } from '@/src/hooks/queries';

export default function Orders() {
  const { navigate } = useAppNavigation();
  const { data: orders = [], isLoading } = useOrders();

  return (
    <div className="min-h-screen bg-mezo-bg font-sans selection:bg-mezo-rose/20">
      {/* Header */}
      <header className="px-12 py-10 flex justify-between items-center border-b border-mezo-ink/5 sticky top-0 bg-mezo-bg/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-mezo-ink/5 rounded-full transition-colors group">
            <ArrowLeft className="text-mezo-ink/40 group-hover:text-mezo-ink transition-colors" size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tighter italic text-mezo-ink">Your Acquisitions</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-mezo-gold mt-1">Order History & Physical Tracking</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-xl border border-mezo-ink/5 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-[9px] font-black uppercase tracking-widest text-mezo-ink">2 Shipments Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-12 py-16 grid lg:grid-cols-3 gap-16">
        {/* Left Column: Active Orders */}
        <div className="lg:col-span-2 space-y-12">
          <div className="flex justify-between items-baseline">
            <h2 className="font-display text-4xl font-black tracking-tighter italic text-mezo-ink uppercase">Acquisitions</h2>
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-mezo-ink/20">
              <span className="text-mezo-ink cursor-pointer decoration-2 underline underline-offset-8 decoration-mezo-rose">Active</span>
              <span className="hover:text-mezo-ink cursor-pointer transition-colors underline-offset-8">Archive</span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="h-64 rounded-3xl bg-white/50 animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-24">
              <Package size={48} className="mx-auto text-mezo-ink/10 mb-4" />
              <p className="text-mezo-ink/30 font-black uppercase tracking-widest text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order, i) => (
                <motion.div 
                  key={order.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-3xl border border-mezo-ink/5 p-8 flex flex-col md:flex-row gap-10 hover:shadow-2xl hover:shadow-mezo-ink/5 transition-all group overflow-hidden relative"
                >
                  {/* Abstract Number Background */}
                  <span className="absolute -right-4 -bottom-8 text-[12rem] font-display font-black text-mezo-ink/2 pointer-events-none select-none">{i + 1}</span>
                  
                  <div className="w-full md:w-48 aspect-3/4 rounded-2xl overflow-hidden shrink-0 bg-mezo-cream-dark shadow-inner">
                    <img src={order.img} alt={order.item} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  </div>

                  <div className="flex-1 space-y-8 relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-mezo-gold mb-1 block italic">{order.id}</span>
                        <h3 className="font-display text-2xl font-black tracking-tighter text-mezo-ink italic">{order.item}</h3>
                      </div>
                      <button className="p-2 text-mezo-ink/20 hover:text-mezo-ink transition-colors"><MoreVertical size={20} /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-mezo-ink/30 mb-2">Order Type</p>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-mezo-cream-light rounded-lg"><RotateCcw size={14} className="text-mezo-ink/60" /></div>
                          <span className="text-xs font-black uppercase tracking-tight text-mezo-ink">{order.type}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-mezo-ink/30 mb-2">Contribution</p>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-mezo-cream-light rounded-lg"><CreditCard size={14} className="text-mezo-ink/60" /></div>
                          <span className="text-xs font-black uppercase tracking-tight text-mezo-ink font-mono">{order.cost}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-mezo-ink/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-full", 
                            order.status === 'In Transit' ? "bg-mezo-gold/10 text-mezo-gold" : "bg-green-100 text-green-600"
                          )}>
                            {order.status === 'In Transit' ? <Truck size={16} /> : <CheckCircle2 size={16} />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-mezo-ink">{order.status}</span>
                        </div>
                        <span className="text-[9px] font-bold text-mezo-ink/40 uppercase tracking-widest italic">Estimated Arrival: Oct 18</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-mezo-cream-dark rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: order.status === 'In Transit' ? '65%' : '100%' }}
                          transition={{ duration: 1.5, ease: "circOut" }}
                          className={cn("h-full rounded-full shadow-sm", order.status === 'In Transit' ? "bg-mezo-gold" : "bg-green-500")}
                        ></motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Summaries */}
        <div className="space-y-12">
          <div className="bg-mezo-ink text-white p-10 rounded-[3rem] space-y-12 shadow-3xl shadow-mezo-ink/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-mezo-gold/10 blur-[80px] group-hover:scale-150 transition-transform duration-1000"></div>
            
            <div className="space-y-4 relative z-10">
              <Package size={32} className="text-mezo-gold mb-6" />
              <h4 className="font-display text-4xl font-black tracking-tighter italic leading-none">Sustainability <br/><span className="text-mezo-rose">Impact</span></h4>
              <p className="text-[10px] text-white/40 leading-relaxed font-sans tracking-wide">Every acquisition contributes to our 'Circular Future' initiative. Your current borrowing streak has saved 42kg of CO2.</p>
            </div>

            <div className="space-y-8 relative z-10 pt-8 border-t border-white/5">
              <div className="flex justify-between items-end">
                <span className="text-[8rem] font-display font-black leading-none text-mezo-rose/20 select-none -mb-4">42</span>
                <div className="text-right pb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">KG OF CO2 SAVED</p>
                  <p className="text-[8px] font-bold text-mezo-gold uppercase tracking-[0.2em] mt-2">Elite Contributor Level</p>
                </div>
              </div>
              <button className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-white hover:text-mezo-ink transition-all shadow-xl shadow-black/20 italic">View Full Report</button>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white p-10 rounded-[3rem] border border-mezo-ink/5 space-y-8 shadow-sm">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-mezo-ink">Connected Capital</h5>
            <div className="space-y-4">
              {[
                { icon: <Wallet size={16} />, name: "Phantom Wallet", detail: "0x72...91b0", color: "bg-purple-100 text-purple-600" },
                { icon: <CreditCard size={16} />, name: "Amex Platinum", detail: "•••• 1002", color: "bg-neutral-100 text-neutral-600" }
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-mezo-bg rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-mezo-ink/5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", m.color)}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-tight text-mezo-ink truncate italic">{m.name}</p>
                    <p className="text-[8px] font-bold text-mezo-ink/30 uppercase mt-0.5 tracking-widest font-mono truncate">{m.detail}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-mezo-ink/10 rounded-2xl text-[9px] uppercase font-black tracking-widest text-mezo-ink/20 hover:border-mezo-gold hover:text-mezo-gold transition-all mt-4">+ ADD METHOD</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
