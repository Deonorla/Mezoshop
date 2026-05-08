const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

/**
 * Fetches the current BTC/USD price from CoinGecko.
 * Times out after 5000ms.
 * @returns BTC price in USD as a number (e.g. 95000.42)
 */
export async function fetchBtcPriceUSD(): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(COINGECKO_URL, { signal: controller.signal });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`CoinGecko API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as unknown;
    const price = (data as { bitcoin?: { usd?: unknown } })?.bitcoin?.usd;

    if (typeof price !== "number" || isNaN(price) || price <= 0) {
      throw new Error(`CoinGecko returned invalid price: ${JSON.stringify(data)}`);
    }

    return price;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("CoinGecko request timed out after 5000ms");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
