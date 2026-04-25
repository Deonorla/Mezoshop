/**
 * Typed fetch wrappers for all MezoShop backend endpoints.
 * Every request attaches the X-Wallet-Address header for user identity.
 * 4xx/5xx responses throw a BackendError with the HTTP status code.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

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
};
