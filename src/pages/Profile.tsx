import { useState } from 'react';
import { motion } from 'motion/react';
import { useDisconnect } from 'wagmi';
import {
  Bitcoin, Copy, Check, LogOut, MapPin, Phone,
  User, ChevronLeft, Pencil, Save,
} from 'lucide-react';
import { useAuth, type UserProfile } from '@/src/hooks/useAuth';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { cn } from '@/src/lib/utils';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Nigeria', 'South Africa', 'UAE', 'Singapore', 'Other',
];

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Profile() {
  const { address, getProfile, saveProfile } = useAuth();
  const { navigate } = useAppNavigation();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserProfile>(getProfile());

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    saveProfile(form);
    setEditing(false);
  };

  const profile = getProfile();

  return (
    <div className="min-h-screen bg-mezo-bg font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-mezo-ink/5 px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-mezo-ink/50 hover:text-mezo-ink transition-colors text-[11px] font-black tracking-widest uppercase"
        >
          <ChevronLeft size={16} /> Dashboard
        </button>
        <span className="font-display font-black text-sm tracking-[0.15em] uppercase text-mezo-ink">Profile</span>
        <button
          onClick={() => { disconnect(); navigate('/'); }}
          className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-mezo-ink/40 hover:text-red-500 transition-colors"
        >
          <LogOut size={14} /> Disconnect
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Wallet card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-mezo-ink text-white rounded-2xl p-8 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-mezo-gold/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-mezo-rose/10 blur-3xl rounded-full" />

          <div className="relative z-10 space-y-6">
            {/* Avatar + address */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-mezo-gold/20 border border-mezo-gold/30 flex items-center justify-center">
                <User size={24} className="text-mezo-gold" />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.3em] uppercase text-white/40 mb-1">
                  Connected Wallet
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {address ? shortAddress(address) : '—'}
                  </span>
                  <button onClick={copyAddress} className="text-white/40 hover:text-white transition-colors">
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Wallet stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'BTC Collateral', value: '0.42 BTC', sub: null },
                { label: 'MUSD Borrowed', value: '2,400', sub: 'MUSD' },
                { label: 'Available', value: '22,400', sub: 'MUSD' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/8">
                  <p className="text-[8px] font-black tracking-widest uppercase text-white/30 mb-1">{label}</p>
                  <p className="text-lg font-black text-white leading-none">
                    {value}
                    {sub && <span className="text-[10px] text-white/40 ml-1">{sub}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Style preferences */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[profile.aesthetic, profile.shopFor, profile.size].filter(Boolean).map(tag => (
                <span key={tag} className="text-[9px] font-black tracking-widest uppercase bg-white/10 text-white/60 px-3 py-1.5 rounded-full border border-white/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Delivery details */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-mezo-ink/5 p-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-mezo-gold" />
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-mezo-ink">
                Delivery Details
              </span>
            </div>
            {!editing ? (
              <button
                onClick={() => { setForm(getProfile()); setEditing(true); }}
                className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-mezo-ink/40 hover:text-mezo-ink transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-mezo-rose hover:text-mezo-rose-dark transition-colors"
              >
                <Save size={12} /> Save
              </button>
            )}
          </div>

          {!editing ? (
            // Read view
            <div className="space-y-4">
              {[
                { icon: <User size={13} />, label: 'Full Name', value: profile.fullName },
                { icon: <Phone size={13} />, label: 'Phone', value: profile.phone },
                { icon: <MapPin size={13} />, label: 'Address', value: profile.addressLine },
                { icon: null, label: 'City', value: profile.city },
                { icon: null, label: 'Country', value: profile.country },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-mezo-ink/30 mt-0.5 w-4 shrink-0">{icon}</span>
                  <div>
                    <p className="text-[9px] font-black tracking-widest uppercase text-mezo-ink/30 mb-0.5">{label}</p>
                    <p className={cn('text-sm font-semibold', value ? 'text-mezo-ink' : 'text-mezo-ink/20')}>
                      {value || 'Not set'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Edit view
            <div className="space-y-4">
              {[
                { key: 'fullName', label: 'Full Name', placeholder: 'John Doe', type: 'text' },
                { key: 'phone', label: 'Phone Number', placeholder: '+1 234 567 8900', type: 'tel' },
                { key: 'addressLine', label: 'Street Address', placeholder: '123 Main St', type: 'text' },
                { key: 'city', label: 'City', placeholder: 'New York', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-[9px] font-black tracking-[0.3em] uppercase text-mezo-ink/40 mb-1.5">
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof UserProfile] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-mezo-ink/10 rounded-xl px-4 py-3 text-sm text-mezo-ink placeholder:text-mezo-ink/20 focus:outline-none focus:border-mezo-ink transition-colors bg-mezo-bg"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[9px] font-black tracking-[0.3em] uppercase text-mezo-ink/40 mb-1.5">
                  Country
                </label>
                <select
                  value={form.country ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full border border-mezo-ink/10 rounded-xl px-4 py-3 text-sm text-mezo-ink focus:outline-none focus:border-mezo-ink transition-colors bg-mezo-bg appearance-none"
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={() => setEditing(false)}
                className="text-[10px] font-black tracking-widest uppercase text-mezo-ink/30 hover:text-mezo-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>

        {/* Bitcoin collateral CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-mezo-gold/10 border border-mezo-gold/20 rounded-2xl p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Bitcoin size={20} className="text-mezo-gold" />
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-mezo-ink/50">Ready to borrow</p>
              <p className="text-lg font-black text-mezo-ink">22,400 MUSD available</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/borrow')}
            className="bg-mezo-ink text-white text-[10px] font-black tracking-widest uppercase px-5 py-3 rounded-xl hover:bg-mezo-rose transition-colors"
          >
            Borrow MUSD
          </button>
        </motion.div>
      </div>
    </div>
  );
}
