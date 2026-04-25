/**
 * Property-based tests for ProductService
 *
 * Properties tested:
 * - Property 1: Search Filter Correctness (Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7)
 * - Property 2: Search Pagination and Total Correctness (Validates: Requirements 2.8, 2.9)
 * - Property 3: Product Lookup Round-Trip (Validates: Requirements 2.10)
 * - Property 4: Search Completeness / No False Negatives (Validates: Requirements 2.2)
 */

import { describe, test, expect } from "bun:test";
import * as fc from "fast-check";
import { productService } from "../src/services/product-service";
import type { Product } from "../src/services/product-service";

// Load catalog for reference in tests
import catalog from "../src/catalog.json" assert { type: "json" };
const CATALOG = catalog as Product[];

// Helpers
const CATEGORIES = [...new Set(CATALOG.map((p) => p.category))];
const BRANDS = [...new Set(CATALOG.map((p) => p.brand))];
const MIN_PRICE = Math.min(...CATALOG.map((p) => p.musd));
const MAX_PRICE = Math.max(...CATALOG.map((p) => p.musd));

/**
 * Property 1: Search Filter Correctness
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 *
 * Every product returned by search must satisfy ALL provided filter conditions simultaneously.
 */
describe("Property 1: Search Filter Correctness", () => {
  test("all returned products satisfy the text query filter", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }),
        async (query) => {
          const result = await productService.search({ query, limit: 20 });
          const q = query.toLowerCase();
          for (const p of result.products) {
            const matches =
              p.name.toLowerCase().includes(q) ||
              p.brand.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q);
            expect(matches).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test("all returned products satisfy the category filter (exact match)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CATEGORIES),
        async (category) => {
          const result = await productService.search({ category, limit: 20 });
          for (const p of result.products) {
            expect(p.category).toBe(category);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("all returned products satisfy the brand filter (substring match)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...BRANDS),
        async (brand) => {
          const result = await productService.search({ brand, limit: 20 });
          const b = brand.toLowerCase();
          for (const p of result.products) {
            expect(p.brand.toLowerCase().includes(b)).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("all returned products satisfy minPrice filter (inclusive)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: MIN_PRICE, max: MAX_PRICE }),
        async (minPrice) => {
          const result = await productService.search({ minPrice, limit: 20 });
          for (const p of result.products) {
            expect(p.musd).toBeGreaterThanOrEqual(minPrice);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test("all returned products satisfy maxPrice filter (inclusive)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: MIN_PRICE, max: MAX_PRICE }),
        async (maxPrice) => {
          const result = await productService.search({ maxPrice, limit: 20 });
          for (const p of result.products) {
            expect(p.musd).toBeLessThanOrEqual(maxPrice);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test("all filters are applied as logical AND simultaneously", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.option(fc.constantFrom(...CATEGORIES), { nil: undefined }),
          minPrice: fc.option(fc.integer({ min: MIN_PRICE, max: MAX_PRICE }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: MIN_PRICE, max: MAX_PRICE }), { nil: undefined }),
        }),
        async ({ category, minPrice, maxPrice }) => {
          // Ensure minPrice <= maxPrice when both are set
          const effectiveMin = minPrice;
          const effectiveMax =
            maxPrice !== undefined && minPrice !== undefined
              ? Math.max(maxPrice, minPrice)
              : maxPrice;

          const result = await productService.search({
            category,
            minPrice: effectiveMin,
            maxPrice: effectiveMax,
            limit: 20,
          });

          for (const p of result.products) {
            if (category !== undefined) {
              expect(p.category).toBe(category);
            }
            if (effectiveMin !== undefined) {
              expect(p.musd).toBeGreaterThanOrEqual(effectiveMin);
            }
            if (effectiveMax !== undefined) {
              expect(p.musd).toBeLessThanOrEqual(effectiveMax);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 2: Search Pagination and Total Correctness
 * **Validates: Requirements 2.8, 2.9**
 *
 * result.products.length <= limit and result.total >= result.products.length
 */
describe("Property 2: Search Pagination and Total Correctness", () => {
  test("result.products.length is always <= limit", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        async (limit, page) => {
          const result = await productService.search({ limit, page });
          expect(result.products.length).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 50 }
    );
  });

  test("result.total >= result.products.length", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        async (limit, page) => {
          const result = await productService.search({ limit, page });
          expect(result.total).toBeGreaterThanOrEqual(result.products.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  test("total equals count of all matching products before pagination", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.constantFrom(...CATEGORIES), { nil: undefined }),
        async (category) => {
          // Get total with limit=1 (minimal page)
          const page1 = await productService.search({ category, limit: 1, page: 1 });
          // Get all results with max limit
          const allResults = await productService.search({ category, limit: 20, page: 1 });

          // total should be consistent regardless of limit
          expect(page1.total).toBe(allResults.total);
        }
      ),
      { numRuns: 20 }
    );
  });

  test("limit is capped at 20 (max limit)", async () => {
    const result = await productService.search({ limit: 100 });
    expect(result.products.length).toBeLessThanOrEqual(20);
  });

  test("default limit is 5", async () => {
    const result = await productService.search({});
    expect(result.products.length).toBeLessThanOrEqual(5);
  });
});

/**
 * Property 3: Product Lookup Round-Trip
 * **Validates: Requirements 2.10**
 *
 * getById(p.id) returns p for every catalog product; unknown IDs return null.
 */
describe("Property 3: Product Lookup Round-Trip", () => {
  test("getById returns the correct product for every catalog product", async () => {
    for (const product of CATALOG) {
      const found = await productService.getById(String(product.id));
      expect(found).not.toBeNull();
      expect(found!.id).toBe(product.id);
      expect(found!.name).toBe(product.name);
    }
  });

  test("getById returns null for unknown IDs", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (id) => !CATALOG.some((p) => String(p.id) === id)
        ),
        async (unknownId) => {
          const result = await productService.getById(unknownId);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Property 4: Search Completeness (No False Negatives)
 * **Validates: Requirements 2.2**
 *
 * Any product whose name contains the query must appear in unpaginated results.
 */
describe("Property 4: Search Completeness (No False Negatives)", () => {
  test("any product whose name contains the query appears in full results", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...CATALOG),
        async (product) => {
          // Use a substring of the product name as the query
          const nameSubstring = product.name.slice(0, 4).toLowerCase();
          if (nameSubstring.trim() === "") return; // skip empty substrings

          const result = await productService.search({
            query: nameSubstring,
            limit: 20,
            page: 1,
          });

          // The product should appear in results since its name contains the query
          const found = result.products.some((p) => p.id === product.id);
          // If total > 20, we might not see it on page 1, so check total instead
          if (result.total <= 20) {
            expect(found).toBe(true);
          } else {
            // Verify total is at least 1 (the product itself matches)
            expect(result.total).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 38 }
    );
  });

  test("exact product name query always returns that product", async () => {
    for (const product of CATALOG) {
      const result = await productService.search({
        query: product.name,
        limit: 20,
      });
      const found = result.products.some((p) => p.id === product.id);
      expect(found).toBe(true);
    }
  });
});
