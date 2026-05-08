import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import {
  fetchProducts,
  fetchProduct,
  fetchCart,
  addToCart,
  removeFromCart,
  fetchOrders,
  fetchBorrowPosition,
  fetchBorrowHistory,
  executeBorrow,
  executeRepay,
  fetchPortfolio,
  type CartItem,
} from '@/src/lib/api';
import { backendClient } from '@/src/lib/backendClient';
import { PRODUCTS } from '@/src/lib/products';

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
  const { address } = useAccount();
  return useQuery({
    queryKey: keys.cart(),
    queryFn: async () => {
      if (!address) return [];
      const backendItems = await backendClient.getCart(address);
      // Enrich backend CartItems with local product data for UI compatibility
      return backendItems.map(item => {
        const product = PRODUCTS.find(p => String(p.id) === item.productId);
        return {
          productId: item.productId as unknown as number, // keep UI compat key
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          // Attach the backend item id for removal
          _backendId: item.id,
          product: product ?? {
            id: 0,
            name: item.productId,
            brand: '',
            category: '',
            musd: 0,
            tag: '',
            description: '',
            images: [],
          },
        };
      });
    },
    enabled: !!address,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  const { address } = useAccount();
  return useMutation({
    mutationFn: async (item: CartItem) => {
      if (!address) throw new Error('Wallet not connected');
      await backendClient.addCartItem(address, {
        productId: String(item.productId),
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      });
      // Refetch cart to get updated data
      return qc.invalidateQueries({ queryKey: keys.cart() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart() }),
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  const { address } = useAccount();
  return useMutation({
    mutationFn: async (productId: number) => {
      if (!address) throw new Error('Wallet not connected');
      // Get current cart to find the backend item id
      const cartData = qc.getQueryData<ReturnType<typeof useCart>['data']>(keys.cart());
      const item = cartData?.find(i => i.productId === productId);
      const backendId = (item as { _backendId?: string })?._backendId ?? String(productId);
      await backendClient.removeCartItem(address, backendId);
      return qc.invalidateQueries({ queryKey: keys.cart() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart() }),
  });
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export function useWishlist() {
  const { address } = useAccount();
  return useQuery({
    queryKey: keys.wishlist(),
    queryFn: async () => {
      if (!address) return [];
      const ids = await backendClient.getWishlist(address);
      // Return as numbers for backward compatibility with existing UI
      return ids.map(Number).filter(n => !isNaN(n));
    },
    enabled: !!address,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  const { address } = useAccount();
  return useMutation({
    mutationFn: async (productId: number) => {
      if (!address) throw new Error('Wallet not connected');
      const current = qc.getQueryData<number[]>(keys.wishlist()) ?? [];
      if (current.includes(productId)) {
        await backendClient.removeFromWishlist(address, String(productId));
      } else {
        await backendClient.addToWishlist(address, String(productId));
      }
      return productId;
    },
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

/** Fetches orders from the real backend for the connected wallet. */
export function useBackendOrders() {
  const { address } = useAccount();
  return useQuery({
    queryKey: [...keys.orders(address), 'backend'],
    queryFn: () => backendClient.getOrders(address!),
    enabled: !!address,
    staleTime: 30_000,
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
