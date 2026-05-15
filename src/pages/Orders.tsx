import { motion } from 'motion/react';
import { Package, ArrowLeft, ExternalLink, Bitcoin, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useBackendOrders } from '@/src/hooks/queries';
import { PRODUCTS, getProduct } from '@/src/lib/products';
import type { Order } from '@/src/lib/backendClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function getColorImage(images: string[], selectedColor?: string): string {
  if (!selectedColor || !images.length) return images[0] ?? '';
  const colorLower = selectedColor.toLowerCase().replace(/\s+/g, '_');
  return images.find(img => img.toLowerCase().includes(colorLower)) ?? images[0];
}

// ─── Order Item Card ──────────────────────────────────────────────────────────

interface OrderItemRowProps {
  productId: string;
  quantity: number;
  priceMusd: number;
  color?: string;
  size?: string;
}

function OrderItemRow({ productId, quantity, priceMusd, color, size }: OrderItemRowProps) {
  const product = getProduct(Number(productId));
  if (!product) return null;

  const image = getColorImage(product.images, color);

  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-16 rounded-xl overflow-hidden shrink-0 bg-mezo-cream-dark border border-mezo-ink/5">
        <img src={image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-mezo-ink truncate">{product.name}</p>
        <p className="text-[9px] font-black tracking-[0.2em] uppercase text-mezo-gold mb-0.5">{product.brand}</p>
        <div className="flex items-center gap-1.5">
          {color && (
            <span className="text-[8px] font-black uppercase tracking-widest bg-mezo-ink/5 text-mezo-ink/50 px-2 py-0.5 rounded-full">
              {color}
            </span>
          )}
          {size && (
            <span className="text-[8px] font-black uppercase tracking-widest bg-mezo-ink/5 text-mezo-ink/50 px-2 py-0.5 rounded-full">
              {size}
            </span>
          )}
          {quantity > 1 && (
            <span className="text-[8px] font-black uppercase tracking-widest text-mezo-ink/30">
              ×{quantity}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-black text-mezo-ink shrink-0">{priceMusd.toLocaleString()} MUSD</p>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, index }: { order: Order; index: number }) {
  const isConfirmed = order.status === 'confirmed';
  const firstItem = order.items[0];
  const firstProduct = firstItem ? getProduct(Number(firstItem.productId)) : null;

  // Get the color from the cart item if stored (items may have color field)
  const firstItemColor = (firstItem as { color?: string })?.color;
  const heroImage = firstProduct
    ? getColorImage(firstProduct.images, firstItemColor)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white rounded-2xl border border-mezo-ink/5 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-mezo-ink/5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isConfirmed ? 'bg-green-100' : 'bg-mezo-gold/10'
          )}>
            {isConfirmed
              ? <CheckCircle2 size={16} className="text-green-600" />
              : <Clock size={16} className="text-mezo-gold" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-mezo-ink/40">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className={cn(
              'text-[9px] font-black uppercase tracking-widest',
              isConfirmed ? 'text-green-600' : 'text-mezo-gold'
            )}>
              {isConfirmed ? 'Confirmed' : 'Processing'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-mezo-ink/30 font-black uppercase tracking-widest">{formatDate(order.createdAt)}</p>
          <p className="text-sm font-black text-mezo-ink">{order.totalMusd.toLocaleString()} MUSD</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Hero image + items */}
        <div className="flex gap-4">
          {/* Hero image */}
          {heroImage && (
            <div className="w-24 h-28 rounded-xl overflow-hidden shrink-0 bg-mezo-cream-dark border border-mezo-ink/5">
              <img src={heroImage} alt={firstProduct?.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 space-y-3">
            {order.items.map((item, i) => (
              <OrderItemRow
                key={i}
                productId={item.productId}
                quantity={item.quantity}
                priceMusd={item.priceMusd}
                color={(item as { color?: string }).color}
                size={(item as { size?: string }).size}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-mezo-ink/5">
          <div className="flex items-center gap-2">
            <Bitcoin size={12} className="text-mezo-gold" />
            <span className="text-[9px] font-black uppercase tracking-widest text-mezo-ink/40">
              Paid with MUSD on Mezo
            </span>
          </div>
          {order.txHash && (
            <a
              href={`https://explorer.test.mezo.org/tx/${order.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-mezo-gold hover:text-mezo-ink transition-colors"
            >
              View on chain <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Orders() {
  const { navigate } = useAppNavigation();
  const { data: orders = [], isLoading } = useBackendOrders();

  return (
    <div className="min-h-screen bg-mezo-bg font-sans">
      {/* Header */}
      <header className="px-8 md:px-12 py-8 flex items-center justify-between border-b border-mezo-ink/5 sticky top-0 bg-mezo-bg/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 hover:bg-mezo-ink/5 rounded-full transition-colors group"
          >
            <ArrowLeft className="text-mezo-ink/40 group-hover:text-mezo-ink transition-colors" size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tighter italic text-mezo-ink">My Orders</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-mezo-gold mt-0.5">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} · paid with MUSD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-mezo-ink/5 rounded-full shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-mezo-ink/50">
            {orders.filter(o => o.status === 'pending').length} processing
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 md:px-12 py-10 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-white/50 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 space-y-4"
          >
            <Package size={48} className="mx-auto text-mezo-ink/10" />
            <p className="text-mezo-ink/30 font-black uppercase tracking-widest text-sm">No orders yet</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-[10px] font-black uppercase tracking-widest text-mezo-gold hover:text-mezo-ink transition-colors"
            >
              Start shopping →
            </button>
          </motion.div>
        ) : (
          orders.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))
        )}
      </main>
    </div>
  );
}
