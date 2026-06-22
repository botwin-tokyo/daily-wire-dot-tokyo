/**
 * Server-side proxy for CoinGecko market data.
 *
 * Fetches the top cryptocurrencies by market cap and caches the response to
 * stay within CoinGecko's free-tier rate limits.
 */

import { createFileRoute } from "@tanstack/react-router";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";

export interface CryptoTickerItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  image: string;
}

export const Route = createFileRoute("/api/crypto-ticker")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const response = await fetch(COINGECKO_URL, {
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`CoinGecko returned ${response.status}`);
          }

          const data = (await response.json()) as CryptoTickerItem[];

          return new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            },
          });
        } catch (err) {
          console.error("Crypto ticker fetch failed:", err);
          return new Response(JSON.stringify([]), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
