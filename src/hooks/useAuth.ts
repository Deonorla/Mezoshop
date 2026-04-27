import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const { address, status } = useAccount();
  const qc = useQueryClient();

  // Treat wagmi as the source of truth — only resolve once it's done reconnecting
  const isSettled = status === 'connected' || status === 'disconnected';
  const isConnected = status === 'connected' && !!address;
  // TanStack Query manages onboarding state — keyed per address
  const { data: hasOnboarded = false } = useQuery({
    queryKey: ['auth', 'onboarded', address],
    queryFn: () => {
      if (!address) return false;
      return localStorage.getItem(onboardingKey(address)) === 'true';
    },
    enabled: isConnected,
    staleTime: Infinity, // never goes stale — we invalidate manually on markOnboarded
  });

  const markOnboarded = () => {
    if (!address) return;
    localStorage.setItem(onboardingKey(address), 'true');
    // Immediately update the cache so ProtectedRoute sees it before navigation
    qc.setQueryData(['auth', 'onboarded', address], true);
  };

  const saveProfile = (profile: UserProfile) => {
    if (!address) return;
    localStorage.setItem(profileKey(address), JSON.stringify(profile));
    qc.setQueryData(['auth', 'profile', address], profile);
  };

  const getProfile = (): UserProfile => {
    if (!address) return {};
    // Check cache first
    const cached = qc.getQueryData<UserProfile>(['auth', 'profile', address]);
    if (cached) return cached;
    try {
      return JSON.parse(localStorage.getItem(profileKey(address)) ?? '{}');
    } catch {
      return {};
    }
  };

  return {
    isConnected,
    isSettled,   // true once wagmi has finished reconnecting — use this to gate redirects
    address,
    hasOnboarded,
    markOnboarded,
    saveProfile,
    getProfile,
  };
}
