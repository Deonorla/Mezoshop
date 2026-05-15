import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, ArrowLeft, ExternalLink, Bitcoin, CheckCircle2, Clock, MapPin, Truck, X, Navigation } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useBackendOrders } from '@/src/hooks/queries';
import { useAuth } from '@/src/hooks/useAuth';
import { getProduct } from '@/src/lib/products';
import type { Order } from '@/src/lib/backendClient';
import 'leaflet/dist/leaflet.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return isoString; }
}

function getColorImage(images: string[], selectedColor?: string): string {
  if (!selectedColor || !images.length) return images[0] ?? '';
  const colorLower = selectedColor.toLowerCase().replace(/\s+/g, '_');
  return images.find(img => img.toLowerCase().includes(colorLower)) ?? images[0];
}

// Geocode an address string to [lat, lng] using Nominatim (free, no API key)
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { /* ignore */ }
  return null;
}

// MezoShop warehouse location (Lagos, Nigeria — fictional)
const WAREHOUSE: [number, number] = [6.5244, 3.3792];
const WAREHOUSE_LABEL = 'MezoShop Warehouse, Lagos';

// ─── Delivery Map Component ───────────────────────────────────────────────────

interface DeliveryMapProps {
  destination: [number, number] | null;
  destinationLabel: string;
  orderDate: string;
}

function DeliveryMap({ destination, destinationLabel, orderDate }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const dest = destination ?? [51.505, -0.09]; // fallback to London
      const center: [number, number] = [
        (WAREHOUSE[0] + dest[0]) / 2,
        (WAREHOUSE[1] + dest[1]) / 2,
      ];

      const map = L.map(mapRef.current!).setView(center, 3);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Warehouse marker (gold)
      const warehouseIcon = L.divIcon({
        html: `<div style="background:#C9A84C;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      // Destination marker (dark)
      const destIcon = L.divIcon({
        html: `<div style="background:#1a1a1a;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker(WAREHOUSE, { icon: warehouseIcon })
        .addTo(map)
        .bindPopup(`<b>📦 ${WAREHOUSE_LABEL}</b><br/>Your order ships from here`);

      L.marker(dest, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>📍 ${destinationLabel}</b><br/>Estimated delivery: 5–7 business days`);

      // Draw a dashed line between warehouse and destination
      L.polyline([WAREHOUSE, dest], {
        color: '#C9A84C',
        weight: 2,
        dashArray: '6, 8',
        opacity: 0.8,
      }).addTo(map);

      // Fit bounds to show both markers
      map.fitBounds([WAREHOUSE, dest], { padding: [40, 40] });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [destination]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-mezo-gold" />
          <span className="text-[10px] font-black uppercase tracking-widest text-mezo-ink/50">{WAREHOUSE_LABEL}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-mezo-ink" />
          <span className="text-[10px] font-black uppercase tracking-widest text-mezo-ink/50 truncate max-w-[160px]">{destinationLabel}</span>
        </div>
      </div>
      <div
        ref={mapRef}
        className="w-full h-56 rounded-xl overflow-hidden border border-mezo-ink/10"
        style={{ zIndex: 0 }}
      />
      <div className="flex items-center gap-2 text-[9px] text-mezo-ink/30 font-black uppercase tracking-widest">
        <Truck size={10} />
        <span>Ordered {formatDate(orderDate)} · Est. delivery 5–7 business days</span>
      </div>
    </div>
  );
}

// ─── Track Order Modal ────────────────────────────────────────────────────────

interface TrackOrderModalProps {
  order: Order;
  onClose: () => void;
}

function TrackOrderModal({ order, onClose }: TrackOrderModalProps) {
  const { getProfile } = useAuth();
  const profile = getProfile();
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destinationLabel, setDestinationLabel] = useState('Your delivery address');

  useEffect(() => {
    const parts = [profile.addressLine, profile.city, profile.country].filter(Boolean);
    if (parts.length > 0) {
      const addressStr = parts.join(', ');
      setDestinationLabel(addressStr);
      geocodeAddress(addressStr).then((coords) => {
        if (coords) setDestination(coords);
      });
    }
  }, []);

  const steps = [
    { label: 'Order Placed', done: true, date: formatDate(order.createdAt) },
    { label: 'Payment Confirmed', done: true, date: formatDate(order.createdAt) },
    { label: 'Processing', done: order.status === 'confirmed', date: order.status === 'confirmed' ? 'Completed' : 'In progress' },
    { label: 'Shipped', done: false, date: 'Pending' },
    { label: 'Delivered', done: false, date: 'Pending' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-mezo-bg rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b border-mezo-ink/5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-mezo-gold">Track Order</p>
            <h3 className="font-display text-xl font-black tracking-tighter text-mezo-ink">
              #{order.id.slice(0, 8).toUpperCase()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-mezo-ink/5 flex items-center justify-center hover:bg-mezo-ink/10 transition-colors"
          >
            <X size={14} className="text-mezo-ink/60" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Delivery address */}
          <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-mezo-ink/5">
            <MapPin size={16} className="text-mezo-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-mezo-ink/40 mb-0.5">Delivery Address</p>
              {profile.addressLine || profile.city ? (
                <p className="text-sm font-black text-mezo-ink">
                  {[profile.fullName, profile.addressLine, profile.city, profile.country].filter(Boolean).join(', ')}
                </p>
              ) : (
                <p className="text-sm text-mezo-ink/30">No delivery address saved — add one in your profile</p>
              )}
            </div>
          </div>

          {/* Progress steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                  step.done
                    ? 'bg-green-500 border-green-500'
                    : i === steps.findIndex(s => !s.done)
                    ? 'bg-mezo-gold/20 border-mezo-gold'
                    : 'bg-transparent border-mezo-ink/10'
                )}>
                  {step.done
                    ? <CheckCircle2 size={14} className="text-white" />
                    : i === steps.findIndex(s => !s.done)
                    ? <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-mezo-gold"
                      />
                    : <div className="w-2 h-2 rounded-full bg-mezo-ink/10" />
                  }
                </div>
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-black',
                    step.done ? 'text-mezo-ink' : 'text-mezo-ink/30'
                  )}>{step.label}</p>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-mezo-ink/30">{step.date}</p>
              </div>
            ))}
          </div>

          {/* Delivery map */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-mezo-gold" />
              <p className="text-[10px] font-black uppercase tracking-widest text-mezo-ink/50">Delivery Route</p>
            </div>
            <DeliveryMap
              destination={destination}
              destinationLabel={destinationLabel}
              orderDate={order.createdAt}
            />
          </div>

          {/* Tx link */}
          {order.txHash && (
            <a
              href={`https://explorer.test.mezo.org/tx/${order.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-mezo-ink/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-mezo-ink/50 hover:bg-mezo-ink/10 hover:text-mezo-ink transition-colors"
            >
              <ExternalLink size={12} /> View payment on Mezo Explorer
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Order Item Row ───────────────────────────────────────────────────────────

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
          {color && <span className="text-[8px] font-black uppercase tracking-widest bg-mezo-ink/5 text-mezo-ink/50 px-2 py-0.5 rounded-full">{color}</span>}
          {size && <span className="text-[8px] font-black uppercase tracking-widest bg-mezo-ink/5 text-mezo-ink/50 px-2 py-0.5 rounded-full">{size}</span>}
          {quantity > 1 && <span className="text-[8px] font-black uppercase tracking-widest text-mezo-ink/30">×{quantity}</span>}
        </div>
      </div>
      <p className="text-sm font-black text-mezo-ink shrink-0">{priceMusd.toLocaleString()} MUSD</p>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, index, onTrack }: { order: Order; index: number; onTrack: (o: Order) => void }) {
  const isConfirmed = order.status === 'confirmed';
  const firstItem = order.items[0];
  const firstProduct = firstItem ? getProduct(Number(firstItem.productId)) : null;
  const firstItemColor = (firstItem as { color?: string })?.color;
  const heroImage = firstProduct ? getColorImage(firstProduct.images, firstItemColor) : null;

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
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', isConfirmed ? 'bg-green-100' : 'bg-mezo-gold/10')}>
            {isConfirmed ? <CheckCircle2 size={16} className="text-green-600" /> : <Clock size={16} className="text-mezo-gold" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-mezo-ink/40">Order #{order.id.slice(0, 8).toUpperCase()}</p>
            <p className={cn('text-[9px] font-black uppercase tracking-widest', isConfirmed ? 'text-green-600' : 'text-mezo-gold')}>
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
        <div className="flex gap-4">
          {heroImage && (
            <div className="w-24 h-28 rounded-xl overflow-hidden shrink-0 bg-mezo-cream-dark border border-mezo-ink/5">
              <img src={heroImage} alt={firstProduct?.name} className="w-full h-full object-cover" />
            </div>
          )}
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
            <span className="text-[9px] font-black uppercase tracking-widest text-mezo-ink/40">Paid with MUSD</span>
          </div>
          <div className="flex items-center gap-3">
            {order.txHash && (
              <a
                href={`https://explorer.test.mezo.org/tx/${order.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-mezo-gold hover:text-mezo-ink transition-colors"
              >
                Tx <ExternalLink size={9} />
              </a>
            )}
            <button
              onClick={() => onTrack(order)}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-mezo-ink text-white px-3 py-1.5 rounded-lg hover:bg-mezo-gold transition-colors"
            >
              <Truck size={10} /> Track
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Orders() {
  const { navigate } = useAppNavigation();
  const { data: orders = [], isLoading } = useBackendOrders();
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  return (
    <div className="min-h-screen bg-mezo-bg font-sans">
      {/* Track Order Modal */}
      <AnimatePresence>
        {trackingOrder && (
          <TrackOrderModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-8 md:px-12 py-8 flex items-center justify-between border-b border-mezo-ink/5 sticky top-0 bg-mezo-bg/80 backdrop-blur-xl z-40">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 hover:bg-mezo-ink/5 rounded-full transition-colors group">
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
            {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl bg-white/50 animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 space-y-4">
            <Package size={48} className="mx-auto text-mezo-ink/10" />
            <p className="text-mezo-ink/30 font-black uppercase tracking-widest text-sm">No orders yet</p>
            <button onClick={() => navigate('/dashboard')} className="text-[10px] font-black uppercase tracking-widest text-mezo-gold hover:text-mezo-ink transition-colors">
              Start shopping →
            </button>
          </motion.div>
        ) : (
          orders.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} onTrack={setTrackingOrder} />
          ))
        )}
      </main>
    </div>
  );
}
