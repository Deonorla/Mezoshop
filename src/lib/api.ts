/**
 * API layer — currently backed by mock data.
 * Swap fetch() calls here when a real backend is ready.
 */

import { PRODUCTS } from './products';
import type { Product } from './products';

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
  type: 'borrow' | 'repay';
  amount: number;
  date: string;
  status: string;
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

export async function fetchBorrowPosition(_address?: string): Promise<BorrowPosition> {
  await delay(300);
  const btcLocked = 0.42;
  const btcPriceUSD = 65000;
  const collateralValueUSD = btcLocked * btcPriceUSD;
  const totalBorrowable = Math.floor(collateralValueUSD * 0.6);
  const alreadyBorrowed = 2400;
  return {
    btcLocked,
    btcPriceUSD,
    collateralValueUSD,
    totalBorrowable,
    alreadyBorrowed,
    available: totalBorrowable - alreadyBorrowed,
  };
}

export async function fetchBorrowHistory(_address?: string): Promise<BorrowTx[]> {
  await delay(300);
  return [
    { type: 'borrow', amount: 1200, date: 'Apr 18, 2026', status: 'confirmed' },
    { type: 'borrow', amount: 1200, date: 'Apr 10, 2026', status: 'confirmed' },
    { type: 'repay',  amount: 500,  date: 'Apr 5, 2026',  status: 'confirmed' },
  ];
}

export async function executeBorrow(amount: number, _address?: string): Promise<void> {
  await delay(2000); // simulate tx
}

export async function executeRepay(amount: number, _address?: string): Promise<void> {
  await delay(2000);
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
