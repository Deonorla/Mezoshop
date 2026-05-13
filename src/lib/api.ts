/**
 * API layer — borrow/lending functions use real backend calls.
 * Other functions remain mock-backed until a full backend migration.
 */

import { PRODUCTS } from './products';
import type { Product } from './products';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CartEntry extends CartItem {
  product: Product;
}

export interface Order {
  id: string;
  status: 'In Transit' | 'Delivered' | 'Processing';
  date: string;
  item: string;
  type: string;
  cost: string;
  img: string;
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
  type: 'borrow' | 'repay' | 'lock';
  amount: number;
  date: string;
  status: string;
  txHash?: string;
}

export interface PortfolioAsset {
  id: string;
  name: string;
  type: string;
  image: string;
  rarity: string;
  status: string;
}

// ─── In-memory cart (replaces store.ts) ──────────────────────────────────────

const _cart: CartItem[] = [];
const _wishlist = new Set<number>();

// ─── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  await delay(300);
  return PRODUCTS;
}

export async function fetchProduct(id: number): Promise<Product> {
  await delay(200);
  const p = PRODUCTS.find(p => p.id === id);
  if (!p) throw new Error(`Product ${id} not found`);
  return p;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export async function fetchCart(): Promise<CartEntry[]> {
  await delay(150);
  return _cart.map(item => ({
    ...item,
    product: PRODUCTS.find(p => p.id === item.productId)!,
  }));
}

export async function addToCart(item: CartItem): Promise<CartEntry[]> {
  await delay(200);
  const existing = _cart.find(c => c.productId === item.productId && c.size === item.size);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    _cart.push({ ...item });
  }
  return fetchCart();
}

export async function removeFromCart(productId: number): Promise<CartEntry[]> {
  await delay(150);
  const idx = _cart.findIndex(c => c.productId === productId);
  if (idx !== -1) _cart.splice(idx, 1);
  return fetchCart();
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function fetchWishlist(): Promise<number[]> {
  await delay(100);
  return Array.from(_wishlist);
}

export async function toggleWishlist(productId: number): Promise<number[]> {
  await delay(100);
  if (_wishlist.has(productId)) _wishlist.delete(productId);
  else _wishlist.add(productId);
  return Array.from(_wishlist);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function fetchOrders(_address?: string): Promise<Order[]> {
  await delay(400);
  return [
    {
      id: 'ORD-8291',
      status: 'In Transit',
      date: 'Oct 12, 2024',
      item: 'Alabaster Coat',
      type: 'Physical Loan',
      cost: '$120 / Mo',
      img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=300&auto=format&fit=crop',
    },
    {
      id: 'ORD-7721',
      status: 'Delivered',
      date: 'Sept 28, 2024',
      item: 'Cyber Silk Tunic',
      type: 'Full Buy',
      cost: '$1,200',
      img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=300&auto=format&fit=crop',
    },
  ];
}

// ─── Borrow position ──────────────────────────────────────────────────────────

export async function fetchBorrowPosition(address?: string): Promise<BorrowPosition> {
  if (!address) {
    return { btcLocked: 0, btcPriceUSD: 0, collateralValueUSD: 0, totalBorrowable: 0, alreadyBorrowed: 0, available: 0 };
  }
  const res = await fetch(`${BASE_URL}/api/borrow/position`, {
    headers: { 'X-Wallet-Address': address },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchBorrowHistory(address?: string): Promise<BorrowTx[]> {
  if (!address) return [];
  const res = await fetch(`${BASE_URL}/api/borrow/history`, {
    headers: { 'X-Wallet-Address': address },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function executeBorrow(amount: number, address?: string): Promise<void> {
  if (!address) throw new Error('Wallet not connected');
  const res = await fetch(`${BASE_URL}/api/borrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': address },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

export async function executeRepay(amount: number, address?: string): Promise<void> {
  if (!address) throw new Error('Wallet not connected');
  const res = await fetch(`${BASE_URL}/api/repay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': address },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export async function fetchPortfolio(_address?: string): Promise<PortfolioAsset[]> {
  await delay(400);
  return [
    { id: 'MZ-001', name: 'Alabaster Aura',    type: 'Excellence Tier', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80', rarity: 'Legendary', status: 'In Vault' },
    { id: 'MZ-002', name: 'Cyber Silk Tunic',  type: 'Runway Series',   image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80', rarity: 'Epic',      status: 'On Loan'  },
    { id: 'MZ-003', name: 'Brutalist Vest',    type: 'Core Collection', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80', rarity: 'Rare',      status: 'In Vault' },
    { id: 'MZ-004', name: 'Obsidian Mantle',   type: 'Excellence Tier', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80', rarity: 'Legendary', status: 'In Vault' },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
