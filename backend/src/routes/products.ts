import { Hono } from "hono"
import { productService } from "../services/product-service"

export const productsRouter = new Hono()

// GET / — search/list products with optional filters
productsRouter.get("/", async (c) => {
  const query = c.req.query("query")
  const category = c.req.query("category")
  const brand = c.req.query("brand")
  const minPriceRaw = c.req.query("minPrice")
  const maxPriceRaw = c.req.query("maxPrice")
  const pageRaw = c.req.query("page")
  const limitRaw = c.req.query("limit")

  const result = await productService.search({
    query: query ?? undefined,
    category: category ?? undefined,
    brand: brand ?? undefined,
    minPrice: minPriceRaw !== undefined ? Number(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw !== undefined ? Number(maxPriceRaw) : undefined,
    page: pageRaw !== undefined ? Number(pageRaw) : undefined,
    limit: limitRaw !== undefined ? Number(limitRaw) : undefined,
  })

  return c.json(result, 200)
})

// GET /:id — get a single product by ID
productsRouter.get("/:id", async (c) => {
  const id = c.req.param("id")
  const product = await productService.getById(id)

  if (product === null) {
    return c.json({ error: "Product not found" }, 404)
  }

  return c.json(product, 200)
})
