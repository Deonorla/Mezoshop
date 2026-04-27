import catalog from "../catalog.json" assert { type: "json" };

export interface Product {
  id: number;
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

export interface SearchParams {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  query: string;
}

export interface ProductService {
  search(params: SearchParams): Promise<SearchResult>;
  getById(id: string): Promise<Product | null>;
}

// Load catalog once at module load time
const CATALOG: Product[] = catalog as Product[];

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 5;

class ProductServiceImpl implements ProductService {
  async search(params: SearchParams): Promise<SearchResult> {
    let results: Product[] = CATALOG;

    // Text filter: query matches name, brand, description, or category (case-insensitive substring)
    if (params.query && params.query.trim() !== "") {
      const q = params.query.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Category filter: exact match
    if (params.category !== undefined && params.category !== null) {
      results = results.filter((p) => p.category === params.category);
    }

    // Brand filter: case-insensitive substring
    if (params.brand !== undefined && params.brand !== null) {
      const b = params.brand.toLowerCase();
      results = results.filter((p) => p.brand.toLowerCase().includes(b));
    }

    // Price filters: inclusive
    if (params.minPrice !== undefined && params.minPrice !== null) {
      results = results.filter((p) => p.musd >= params.minPrice!);
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      results = results.filter((p) => p.musd <= params.maxPrice!);
    }

    // Compute total BEFORE pagination
    const total = results.length;

    // Pagination
    const page = params.page !== undefined && params.page >= 1 ? params.page : 1;
    const rawLimit =
      params.limit !== undefined && params.limit >= 1 ? params.limit : DEFAULT_LIMIT;
    const limit = Math.min(rawLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const paginated = results.slice(offset, offset + limit);

    return {
      products: paginated,
      total,
      query: params.query ?? "",
    };
  }

  async getById(id: string): Promise<Product | null> {
    const product = CATALOG.find((p) => String(p.id) === id);
    return product ?? null;
  }
}

export const productService = new ProductServiceImpl();
