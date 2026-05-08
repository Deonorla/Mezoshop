import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { backendClient, type UpsertProfileInput } from '@/src/lib/backendClient';

// localStorage keys (used as a fast local cache only)
const LS_ONBOARDING_KEY = 'mezo_onboarded';
const LS_PROFILE_KEY = 'mezo_profile';

function lsOnboardingKey(address: string) {
  return `${LS_ONBOARDING_KEY}_${address.toLowerCase()}`;
}
function lsProfileKey(address: string) {
  return `${LS_PROFILE_KEY}_${address.toLowerCase()}`;
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

  const isSettled = status === 'connected' || status === 'disconnected';
  const isConnected = status === 'connected' && !!address;

  // ── Profile query — fetches from backend, falls back to localStorage ────────
  const { data: backendProfile } = useQuery({
    queryKey: ['auth', 'profile', address],
    queryFn: async () => {
      if (!address) return null;
      try {
        const profile = await backendClient.getProfile(address);

        // One-time migration: if backend has no data yet but localStorage does,
        // sync localStorage data up to the backend silently
        if (!profile.updatedAt) {
          try {
            const lsRaw = localStorage.getItem(lsProfileKey(address));
            const lsOnboarded = localStorage.getItem(lsOnboardingKey(address)) === 'true';
            if (lsRaw || lsOnboarded) {
              const lsProfile: UserProfile = lsRaw ? JSON.parse(lsRaw) : {};
              await backendClient.upsertProfile(address, {
                ...lsProfile,
                onboarded: lsOnboarded,
              });
              return backendClient.getProfile(address);
            }
          } catch {
            // migration failure is non-fatal
          }
        }

        return profile;
      } catch {
        // Backend unreachable — fall back to localStorage
        try {
          const raw = localStorage.getItem(lsProfileKey(address));
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      }
    },
    enabled: isConnected,
    staleTime: 60_000, // 1 min
  });

  // ── Onboarding state ─────────────────────────────────────────────────────────
  const hasOnboarded: boolean =
    backendProfile?.onboarded === true ||
    (address ? localStorage.getItem(lsOnboardingKey(address)) === 'true' : false);

  // ── markOnboarded ────────────────────────────────────────────────────────────
  const markOnboarded = async () => {
    if (!address) return;
    // Optimistic local update
    localStorage.setItem(lsOnboardingKey(address), 'true');
    qc.setQueryData(['auth', 'profile', address], (prev: typeof backendProfile) =>
      prev ? { ...prev, onboarded: true } : prev
    );
    // Persist to backend
    try {
      const updated = await backendClient.upsertProfile(address, { onboarded: true });
      qc.setQueryData(['auth', 'profile', address], updated);
    } catch {
      // non-fatal — localStorage already updated
    }
  };

  // ── saveProfile ──────────────────────────────────────────────────────────────
  const saveProfile = async (profile: UserProfile) => {
    if (!address) return;
    // Optimistic local update
    localStorage.setItem(lsProfileKey(address), JSON.stringify(profile));
    qc.setQueryData(['auth', 'profile', address], (prev: typeof backendProfile) =>
      prev ? { ...prev, ...profile } : profile
    );
    // Persist to backend
    try {
      const input: UpsertProfileInput = {
        aesthetic:   profile.aesthetic,
        shopFor:     profile.shopFor,
        size:        profile.size,
        fullName:    profile.fullName,
        phone:       profile.phone,
        addressLine: profile.addressLine,
        city:        profile.city,
        country:     profile.country,
      };
      const updated = await backendClient.upsertProfile(address, input);
      qc.setQueryData(['auth', 'profile', address], updated);
    } catch {
      // non-fatal — localStorage already updated
    }
  };

  // ── getProfile ───────────────────────────────────────────────────────────────
  // Synchronous read — returns cached data (from query cache or localStorage)
  const getProfile = (): UserProfile => {
    if (!address) return {};
    if (backendProfile) {
      return {
        aesthetic:   backendProfile.aesthetic   ?? undefined,
        shopFor:     backendProfile.shopFor     ?? undefined,
        size:        backendProfile.size        ?? undefined,
        fullName:    backendProfile.fullName    ?? undefined,
        phone:       backendProfile.phone       ?? undefined,
        addressLine: backendProfile.addressLine ?? undefined,
        city:        backendProfile.city        ?? undefined,
        country:     backendProfile.country     ?? undefined,
      };
    }
    // Fallback to localStorage while backend query is loading
    try {
      return JSON.parse(localStorage.getItem(lsProfileKey(address)) ?? '{}');
    } catch {
      return {};
    }
  };

  return {
    isConnected,
    isSettled,
    address,
    hasOnboarded,
    markOnboarded,
    saveProfile,
    getProfile,
  };
}
