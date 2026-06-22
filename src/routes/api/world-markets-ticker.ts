/**
 * Server-side proxy for Yahoo Finance world-index spark data.
 *
 * Fetches major global stock indices in a single request and caches the
 * response to stay within Yahoo's public rate limits.
 */

import { createFileRoute } from "@tanstack/react-router";

const SYMBOLS = [
  "^GSPC",
  "^IXIC",
  "^DJI",
  "^FTSE",
  "^GDAXI",
  "^FCHI",
  "^STOXX50E",
  "^N225",
  "^HSI",
  "^AXJO",
  "^GSPTSE",
  "^NSEI",
  "000001.SS",
];

const YAHOO_URL = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(
  SYMBOLS.join(","),
)}&interval=1d&range=1d`;

const INDEX_NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "Nasdaq",
  "^DJI": "Dow Jones",
  "^FTSE": "FTSE 100",
  "^GDAXI": "DAX",
  "^FCHI": "CAC 40",
  "^STOXX50E": "Euro Stoxx 50",
  "^N225": "Nikkei 225",
  "^HSI": "Hang Seng",
  "^AXJO": "S&P/ASX 200",
  "^GSPTSE": "TSX",
  "^NSEI": "Nifty 50",
  "000001.SS": "Shanghai",
};

export interface WorldMarketItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

interface SparkResponse {
  spark?: {
    result?: Array<{
      symbol: string;
      response: Array<{
        meta: {
          regularMarketPrice: number;
          chartPreviousClose: number;
          shortName?: string;
          longName?: string;
        };
      }>;
    }>;
  };
}

export const Route = createFileRoute("/api/world-markets-ticker")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const response = await fetch(YAHOO_URL, {
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0",
            },
          });

          if (!response.ok) {
            throw new Error(`Yahoo Finance returned ${response.status}`);
          }

          const json = (await response.json()) as SparkResponse;
          const result = json.spark?.result ?? [];

          const data: WorldMarketItem[] = result
            .map((item) => {
              const meta = item.response[0]?.meta;
              if (!meta) return null;
              const previous = meta.chartPreviousClose;
              const price = meta.regularMarketPrice;
              return {
                symbol: item.symbol,
                name: INDEX_NAMES[item.symbol] || meta.shortName || meta.longName || item.symbol,
                price,
                changePct: previous ? ((price - previous) / previous) * 100 : 0,
              };
            })
            .filter((item): item is WorldMarketItem => item != null);

          return new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            },
          });
        } catch (err) {
          console.error("World markets ticker fetch failed:", err);
          return new Response(JSON.stringify([]), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
