import { useAccount } from 'wagmi';

const ONBOARDING_KEY = 'mezo_onboarded';
const PROFILE_KEY = 'mezo_profile';

function onboardingKey(address: string) {
  return `${ONBOARDING_KEY}_${address.toLowerCase()}`;
}

function profileKey(address: string) {
  return `${PROFILE_KEY}_${address.toLowerCase()}`;
}

export interface UserProfile {
  aesthetic?: string;
  shopFor?: string;
  size?: string;
  fullName?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  country?: string;
}

export function useAuth() {
  const { isConnected, address } = useAccount();

  const hasOnboarded = isConnected && address
    ? localStorage.getItem(onboardingKey(address)) === 'true'
    : false;

  const markOnboarded = () => {
    if (address) {
      localStorage.setItem(onboardingKey(address), 'true');
    }
  };

  const saveProfile = (profile: UserProfile) => {
    if (address) {
      localStorage.setItem(profileKey(address), JSON.stringify(profile));
    }
  };

  const getProfile = (): UserProfile => {
    if (!address) return {};
    try {
      return JSON.parse(localStorage.getItem(profileKey(address)) ?? '{}');
    } catch {
      return {};
    }
  };

  return { isConnected, address, hasOnboarded, markOnboarded, saveProfile, getProfile };
}
