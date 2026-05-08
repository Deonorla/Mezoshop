/**
 * Typed fetch wrappers for all MezoShop backend endpoints.
 * Every request attaches the X-Wallet-Address header for user identity.
 * 4xx/5xx responses throw a BackendError with the HTTP status code.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  walletAddress: string;
  aesthetic?: string | null;
  shopFor?: string | null;
  size?: string | null;
  fullName?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
  onboarded: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpsertProfileInput {
  aesthetic?: string;
  shopFor?: string;
  size?: string;
  fullName?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  country?: string;
  onboarded?: boolean;
}

export interface CartItem {
  id: string;
  walletAddress: string;
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  addedAt: string;
}

export interface AddCartItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  musd: number;
  tag: string;
  description: string;
  images: string[];
  colors?: string[];
  sizes?: string[];
}

export interface SearchResult {
  products: Product[];
  total: number;
  query: string;
}

export interface SearchParams {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  priceMusd: number;
}

export interface CreateOrderInput {
  walletAddress: string;
  items: OrderItem[];
  totalMusd: number;
  txHash: string;
}

export interface Order {
  id: string;
  walletAddress: string;
  items: OrderItem[];
  totalMusd: number;
  txHash: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
}

export interface BorrowPosition {
  btcLocked: number;
  btcPriceUSD: number;
  collateralValueUSD: number;
  totalBorrowable: number;
  alreadyBorrowed: number;
  available: number;
}

export interface BorrowTx {
  type: 'borrow' | 'repay';
  amount: number;
  date: string;
  status: string;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.message === 'string') message = body.message;
      else if (typeof body?.error === 'string') message = body.error;
    } catch {
      // ignore JSON parse errors — keep statusText as message
    }
    throw new BackendError(res.status, message);
  }
  return res.json() as Promise<T>;
}

function buildHeaders(walletAddress: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Wallet-Address': walletAddress,
  };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a backend client bound to a specific wallet address.
 * The wallet address is attached as X-Wallet-Address on every request.
 */
export function createBackendClient(walletAddress: string) {
  const headers = () => buildHeaders(walletAddress);

  return {
    // ── Cart ──────────────────────────────────────────────────────────────────

    /** GET /api/cart — returns all cart items for the connected wallet */
    getCart(): Promise<CartItem[]> {
      return fetch(`${BASE_URL}/api/cart`, { headers: headers() }).then(
        (res) => handleResponse<CartItem[]>(res),
      );
    },

    /** POST /api/cart — adds an item to the cart */
    addCartItem(input: AddCartItemInput): Promise<CartItem> {
      return fetch(`${BASE_URL}/api/cart`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
      }).then((res) => handleResponse<CartItem>(res));
    },

    /** DELETE /api/cart/:itemId — removes a specific cart item */
    removeCartItem(itemId: string): Promise<void> {
      return fetch(`${BASE_URL}/api/cart/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: headers(),
      }).then(async (res) => {
        if (!res.ok) {
          let message = res.statusText;
          try {
            const body = await res.json();
            if (typeof body?.message === 'string') message = body.message;
            else if (typeof body?.error === 'string') message = body.error;
          } catch {
            // ignore
          }
          throw new BackendError(res.status, message);
        }
      });
    },

    // ── Products ──────────────────────────────────────────────────────────────

    /** GET /api/products — search/list products with optional filters */
    searchProducts(params: SearchParams = {}): Promise<SearchResult> {
      const query = buildQuery({
        query: params.query,
        category: params.category,
        brand: params.brand,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        page: params.page,
        limit: params.limit,
      });
      return fetch(`${BASE_URL}/api/products${query}`, { headers: headers() }).then(
        (res) => handleResponse<SearchResult>(res),
      );
    },

    /** GET /api/products/:id — fetch a single product by ID */
    getProduct(id: string): Promise<Product | null> {
      return fetch(`${BASE_URL}/api/products/${encodeURIComponent(id)}`, {
        headers: headers(),
      }).then((res) => handleResponse<Product | null>(res));
    },

    // ── Orders ────────────────────────────────────────────────────────────────

    /** POST /api/orders — record a confirmed MUSD purchase */
    createOrder(input: CreateOrderInput): Promise<Order> {
      return fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
      }).then((res) => handleResponse<Order>(res));
    },

    /** GET /api/orders — returns all orders for the connected wallet */
    getOrders(): Promise<Order[]> {
      return fetch(`${BASE_URL}/api/orders`, { headers: headers() }).then(
        (res) => handleResponse<Order[]>(res),
      );
    },

    // ── Borrow / Lending ──────────────────────────────────────────────────────

    /** GET /api/borrow/position — returns the lending position for the connected wallet */
    getBorrowPosition(): Promise<BorrowPosition> {
      return fetch(`${BASE_URL}/api/borrow/position`, { headers: headers() }).then(
        (res) => handleResponse<BorrowPosition>(res),
      );
    },

    /** GET /api/borrow/history — returns borrow/repay transaction history */
    getBorrowHistory(): Promise<BorrowTx[]> {
      return fetch(`${BASE_URL}/api/borrow/history`, { headers: headers() }).then(
        (res) => handleResponse<BorrowTx[]>(res),
      );
    },

    /** POST /api/borrow — executes a borrow transaction */
    executeBorrow(amount: number): Promise<{ txHash: string; btcPriceUSD: number }> {
      return fetch(`${BASE_URL}/api/borrow`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ amount }),
      }).then((res) => handleResponse<{ txHash: string; btcPriceUSD: number }>(res));
    },

    /** POST /api/repay — executes a repay transaction */
    executeRepay(amount: number): Promise<{ txHash: string }> {
      return fetch(`${BASE_URL}/api/repay`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ amount }),
      }).then((res) => handleResponse<{ txHash: string }>(res));
    },

    // ── Profile ───────────────────────────────────────────────────────────────

    /** GET /api/profile — returns the user profile for the connected wallet */
    getProfile(): Promise<UserProfile> {
      return fetch(`${BASE_URL}/api/profile`, { headers: headers() }).then(
        (res) => handleResponse<UserProfile>(res),
      );
    },

    /** PUT /api/profile — creates or updates the user profile */
    upsertProfile(input: UpsertProfileInput): Promise<UserProfile> {
      return fetch(`${BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(input),
      }).then((res) => handleResponse<UserProfile>(res));
    },

    // ── Wishlist ──────────────────────────────────────────────────────────────

    /** GET /api/wishlist — returns wishlisted product IDs */
    getWishlist(): Promise<string[]> {
      return fetch(`${BASE_URL}/api/wishlist`, { headers: headers() }).then(
        (res) => handleResponse<string[]>(res),
      );
    },

    /** POST /api/wishlist/:productId — adds a product to the wishlist */
    addToWishlist(productId: string): Promise<void> {
      return fetch(`${BASE_URL}/api/wishlist/${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: headers(),
      }).then((res) => handleResponse<void>(res));
    },

    /** DELETE /api/wishlist/:productId — removes a product from the wishlist */
    removeFromWishlist(productId: string): Promise<void> {
      return fetch(`${BASE_URL}/api/wishlist/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: headers(),
      }).then((res) => handleResponse<void>(res));
    },
  };
}

// ─── Standalone lazy client ───────────────────────────────────────────────────

/**
 * A standalone client where the wallet address is passed per-call.
 * Useful in contexts where the wallet address may change (e.g. outside React hooks).
 *
 * Usage:
 *   backendClient.getCart(walletAddress)
 *   backendClient.addCartItem(walletAddress, input)
 */
export const backendClient = {
  getCart(walletAddress: string): Promise<CartItem[]> {
    return createBackendClient(walletAddress).getCart();
  },

  addCartItem(walletAddress: string, input: AddCartItemInput): Promise<CartItem> {
    return createBackendClient(walletAddress).addCartItem(input);
  },

  removeCartItem(walletAddress: string, itemId: string): Promise<void> {
    return createBackendClient(walletAddress).removeCartItem(itemId);
  },

  searchProducts(walletAddress: string, params: SearchParams = {}): Promise<SearchResult> {
    return createBackendClient(walletAddress).searchProducts(params);
  },

  getProduct(walletAddress: string, id: string): Promise<Product | null> {
    return createBackendClient(walletAddress).getProduct(id);
  },

  createOrder(walletAddress: string, input: CreateOrderInput): Promise<Order> {
    return createBackendClient(walletAddress).createOrder(input);
  },

  getOrders(walletAddress: string): Promise<Order[]> {
    return createBackendClient(walletAddress).getOrders();
  },

  getBorrowPosition(walletAddress: string): Promise<BorrowPosition> {
    return createBackendClient(walletAddress).getBorrowPosition();
  },

  getBorrowHistory(walletAddress: string): Promise<BorrowTx[]> {
    return createBackendClient(walletAddress).getBorrowHistory();
  },

  executeBorrow(walletAddress: string, amount: number): Promise<{ txHash: string; btcPriceUSD: number }> {
    return createBackendClient(walletAddress).executeBorrow(amount);
  },

  executeRepay(walletAddress: string, amount: number): Promise<{ txHash: string }> {
    return createBackendClient(walletAddress).executeRepay(amount);
  },

  getProfile(walletAddress: string): Promise<UserProfile> {
    return createBackendClient(walletAddress).getProfile();
  },

  upsertProfile(walletAddress: string, input: UpsertProfileInput): Promise<UserProfile> {
    return createBackendClient(walletAddress).upsertProfile(input);
  },

  getWishlist(walletAddress: string): Promise<string[]> {
    return createBackendClient(walletAddress).getWishlist();
  },

  addToWishlist(walletAddress: string, productId: string): Promise<void> {
    return createBackendClient(walletAddress).addToWishlist(productId);
  },

  removeFromWishlist(walletAddress: string, productId: string): Promise<void> {
    return createBackendClient(walletAddress).removeFromWishlist(productId);
  },
};
