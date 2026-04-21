import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import {
  fetchProducts,
  fetchProduct,
  fetchCart,
  addToCart,
  removeFromCart,
  fetchWishlist,
  toggleWishlist,
  fetchOrders,
  fetchBorrowPosition,
  fetchBorrowHistory,
  executeBorrow,
  executeRepay,
  fetchPortfolio,
  type CartItem,
} from '@/src/lib/api';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const keys = {
  products:       () => ['products']                    as const,
  product:        (id: number) => ['products', id]      as const,
  cart:           () => ['cart']                        as const,
  wishlist:       () => ['wishlist']                    as const,
  orders:         (addr?: string) => ['orders', addr]   as const,
  borrowPosition: (addr?: string) => ['borrow', addr]   as const,
  borrowHistory:  (addr?: string) => ['borrowHistory', addr] as const,
  portfolio:      (addr?: string) => ['portfolio', addr] as const,
};

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: keys.products(),
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 min — product catalog rarely changes
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: keys.product(id),
    queryFn: () => fetchProduct(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export function useCart() {
  return useQuery({
    queryKey: keys.cart(),
    queryFn: fetchCart,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: CartItem) => addToCart(item),
    onSuccess: (data) => qc.setQueryData(keys.cart(), data),
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => removeFromCart(productId),
    onSuccess: (data) => qc.setQueryData(keys.cart(), data),
  });
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export function useWishlist() {
  return useQuery({
    queryKey: keys.wishlist(),
    queryFn: fetchWishlist,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => toggleWishlist(productId),
    // Optimistic update
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: keys.wishlist() });
      const prev = qc.getQueryData<number[]>(keys.wishlist()) ?? [];
      const next = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      qc.setQueryData(keys.wishlist(), next);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.wishlist(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.wishlist() }),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export function useOrders() {
  const { address } = useAccount();
  return useQuery({
    queryKey: keys.orders(address),
    queryFn: () => fetchOrders(address),
    enabled: !!address,
  });
}

// ─── Borrow ───────────────────────────────────────────────────────────────────

export function useBorrowPosition() {
  const { address } = useAccount();
  return useQuery({
    queryKey: keys.borrowPosition(address),
    queryFn: () => fetchBorrowPosition(address),
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useBorrowHistory() {
  const { address } = useAccount();
  return useQuery({
    queryKey: keys.borrowHistory(address),
    queryFn: () => fetchBorrowHistory(address),
    enabled: !!address,
  });
}

export function useBorrow() {
  const qc = useQueryClient();
  const { address } = useAccount();
  return useMutation({
    mutationFn: (amount: number) => executeBorrow(amount, address),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.borrowPosition(address) });
      qc.invalidateQueries({ queryKey: keys.borrowHistory(address) });
    },
  });
}

export function useRepay() {
  const qc = useQueryClient();
  const { address } = useAccount();
  return useMutation({
    mutationFn: (amount: number) => executeRepay(amount, address),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.borrowPosition(address) });
      qc.invalidateQueries({ queryKey: keys.borrowHistory(address) });
    },
  });
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export function usePortfolio() {
  const { address } = useAccount();
  return useQuery({
    queryKey: keys.portfolio(address),
    queryFn: () => fetchPortfolio(address),
    enabled: !!address,
  });
}
