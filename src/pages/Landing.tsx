import NavBar from '@/src/components/landing/NavBar';
import HeroSection from '@/src/components/landing/HeroSection';
import MarqueeTicker from '@/src/components/landing/MarqueeTicker';
import HowItWorks from '@/src/components/landing/HowItWorks';
import FeaturedProducts from '@/src/components/landing/FeaturedProducts';
import ConciergeChat from '@/src/components/landing/ConciergeChat';
import FeaturesRow from '@/src/components/landing/FeaturesRow';
import JourneySection from '@/src/components/landing/JourneySection';
import StatsBar from '@/src/components/landing/StatsBar';
import FooterSection from '@/src/components/landing/FooterSection';
import { useAppNavigation } from '@/src/hooks/useAppNavigation';

export default function Landing() {
  const { navigate } = useAppNavigation();

  return (
    <div className="min-h-screen bg-mezo-bg font-sans">
      <NavBar onNavigate={navigate} />
      <HeroSection onNavigate={navigate} />
      <MarqueeTicker />
      <HowItWorks onNavigate={navigate} />
      <FeaturedProducts onNavigate={navigate} />
      <ConciergeChat onNavigate={navigate} />
      <FeaturesRow />
      <JourneySection />
      <StatsBar />
      <FooterSection />
    </div>
  );
}
