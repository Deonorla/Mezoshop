import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, Sparkles, Box, Wallet, MapPin } from 'lucide-react';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';
import { useAuth, type UserProfile } from '@/src/hooks/useAuth';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Nigeria', 'South Africa', 'UAE', 'Singapore', 'Other',
];

export default function Onboarding() {
  const { goToDashboard } = useAppNavigation();
  const { markOnboarded, saveProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [delivery, setDelivery] = useState({
    fullName: '', phone: '', addressLine: '', city: '', country: '',
  });
  const totalSteps = 4;

  const stepsContent = [
    {
      title: 'Set Your Aesthetic',
      desc: 'Our AI Stylist will curate drops that match your personal style from day one.',
      icon: <Sparkles className="text-mezo-gold" size={32} />,
      options: ['Streetwear', 'Quiet Luxury', 'Old Money', 'Avant-Garde'],
    },
    {
      title: 'What Do You Shop For?',
      desc: 'Tell us your focus so your AI stylist can curate the right drops for you.',
      icon: <Wallet className="text-mezo-gold" size={32} />,
      options: ["Men's Fashion", "Women's Fashion", 'Accessories & Bags', 'Footwear', 'All of the Above'],
    },
    {
      title: 'Confirm Your Size',
      desc: 'Our virtual fit-on ensures every piece fits perfectly. No returns needed.',
      icon: <Box className="text-mezo-gold" size={32} />,
      options: ['XS', 'S', 'M', 'L', 'XL', 'Custom Tailor'],
    },
    {
      title: 'Delivery Details',
      desc: 'Where should we ship your orders? This is saved securely to your wallet profile.',
      icon: <MapPin className="text-mezo-gold" size={32} />,
      options: [],
    },
  ];

  const select = (option: string) => {
    setSelections(prev => ({ ...prev, [step]: option }));
  };

  const deliveryValid =
    delivery.fullName.trim() &&
    delivery.phone.trim() &&
    delivery.addressLine.trim() &&
    delivery.city.trim() &&
    delivery.country.trim();

  const canAdvance = step < 4 ? !!selections[step] : !!deliveryValid;

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      const profile: UserProfile = {
        aesthetic: selections[1],
        shopFor: selections[2],
        size: selections[3],
        ...delivery,
      };
      saveProfile(profile);
      markOnboarded();
      setTimeout(() => goToDashboard(), 0);
    }
  };

  const currentSelection = selections[step];

  return (
    <div className="min-h-screen bg-mezo-ink text-white flex items-center justify-center p-8 overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[80vw] h-screen bg-mezo-rose/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] bg-mezo-gold/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-4xl relative z-10 grid lg:grid-cols-2 gap-24 items-center">
        {/* Left: Progress & Info */}
        <div className="space-y-12">
          <div className="flex items-center gap-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 w-10 transition-all duration-500 rounded-full ${
                  i + 1 <= step ? 'bg-mezo-rose' : 'bg-white/10'
                }`}
              />
            ))}
            <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/30 ml-2">
              {step} / {totalSteps}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center rounded-2xl">
                {stepsContent[step - 1].icon}
              </div>
              <h1 className="font-display text-5xl font-black tracking-tighter leading-tight italic">
                {stepsContent[step - 1].title}
              </h1>
              <p className="font-sans text-sm text-white/40 leading-relaxed tracking-wide font-medium max-w-sm">
                {stepsContent[step - 1].desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Selection / Form */}
        <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-4xl border border-white/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-3"
            >
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase font-black text-mezo-gold mb-4">
                {step === 4 ? 'Shipping Info' : 'Selection Portal'}
              </p>

              {/* Steps 1–3: option picker */}
              {step < 4 && stepsContent[step - 1].options.map((option) => {
                const selected = currentSelection === option;
                return (
                  <button
                    key={option}
                    onClick={() => select(option)}
                    className={`w-full text-left py-5 px-7 rounded-xl border flex justify-between items-center transition-all active:scale-[0.98] ${
                      selected ? 'bg-white/15 border-mezo-rose' : 'border-white/10 hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className={`font-sans text-[11px] tracking-[0.2em] font-black uppercase transition-colors ${selected ? 'text-white' : 'text-white/70'}`}>
                      {option}
                    </span>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${selected ? 'border-mezo-rose bg-mezo-rose/20' : 'border-white/20'}`}>
                      <Check size={12} className={`transition-opacity text-mezo-rose ${selected ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  </button>
                );
              })}

              {/* Step 4: delivery form */}
              {step === 4 && (
                <div className="space-y-3">
                  {[
                    { key: 'fullName', label: 'Full Name', placeholder: 'John Doe', type: 'text' },
                    { key: 'phone', label: 'Phone Number', placeholder: '+1 234 567 8900', type: 'tel' },
                    { key: 'addressLine', label: 'Street Address', placeholder: '123 Main St, Apt 4B', type: 'text' },
                    { key: 'city', label: 'City', placeholder: 'New York', type: 'text' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mb-1.5">
                        {label}
                      </label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={delivery[key as keyof typeof delivery]}
                        onChange={e => setDelivery(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-mezo-rose transition-colors"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[9px] font-black tracking-[0.3em] uppercase text-white/30 mb-1.5">
                      Country
                    </label>
                    <select
                      value={delivery.country}
                      onChange={e => setDelivery(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mezo-rose transition-colors appearance-none"
                    >
                      <option value="" className="bg-mezo-ink">Select country...</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c} className="bg-mezo-ink">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="pt-8 mt-6 border-t border-white/10 flex flex-col gap-4">
            <button
              onClick={nextStep}
              disabled={!canAdvance}
              className="w-full bg-white text-mezo-ink py-5 font-sans text-xs tracking-[0.4em] uppercase font-black flex items-center justify-center gap-4 hover:bg-mezo-rose hover:text-white transition-all rounded-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === totalSteps ? 'Enter Mezo' : 'Next'}
              <ArrowRight size={18} />
            </button>
            <p className="text-center font-sans text-[9px] tracking-[0.2em] uppercase font-black text-white/20">
              Personalized for individual sovereignty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
