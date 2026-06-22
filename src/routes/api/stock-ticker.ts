/**
 * Server-side proxy for Nasdaq stock screener data.
 *
 * Returns the most actively traded large-cap stocks from the Nasdaq exchange.
 * The response is cached to avoid hitting Nasdaq's public API on every request.
 */

import { createFileRoute } from "@tanstack/react-router";

const NASDAQ_URL =
  "https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25&exchange=NASDAQ";

export interface StockTickerItem {
  symbol: string;
  name: string;
  lastSale: string;
  netChange: string;
  pctChange: string;
}

interface NasdaqRow {
  symbol: string;
  name: string;
  lastsale: string;
  netchange: string;
  pctchange: string;
}

interface NasdaqResponse {
  data?: {
    table?: {
      rows?: NasdaqRow[];
    };
  };
}

export const Route = createFileRoute("/api/stock-ticker")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const response = await fetch(NASDAQ_URL, {
            headers: {
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0",
            },
          });

          if (!response.ok) {
            throw new Error(`Nasdaq returned ${response.status}`);
          }

          const json = (await response.json()) as NasdaqResponse;
          const rows = json.data?.table?.rows ?? [];

          const data: StockTickerItem[] = rows.map((row) => ({
            symbol: row.symbol,
            name: row.name,
            lastSale: row.lastsale,
            netChange: row.netchange,
            pctChange: row.pctchange,
          }));

          return new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            },
          });
        } catch (err) {
          console.error("Stock ticker fetch failed:", err);
          return new Response(JSON.stringify([]), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
