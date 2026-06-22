import { useQuery, queryOptions } from "@tanstack/react-query";
import type { StockTickerItem } from "@/routes/api/stock-ticker";

const tickerQuery = queryOptions({
  queryKey: ["stock-ticker"],
  queryFn: async () => {
    const res = await fetch("/api/stock-ticker");
    if (!res.ok) throw new Error("Failed to load stock ticker");
    return (await res.json()) as StockTickerItem[];
  },
  refetchInterval: 60_000,
  staleTime: 30_000,
});

function parseChange(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

function TickerRow({ items }: { items: StockTickerItem[] }) {
  return (
    <>
      {items.map((stock) => {
        const change = parseChange(stock.pctChange);
        const positive = change >= 0;
        return (
          <span
            key={stock.symbol}
            className="inline-flex items-center gap-2 whitespace-nowrap px-4"
          >
            <span className="font-sans text-[13px] font-semibold text-[var(--ink)]">
              {stock.symbol}
            </span>
            <span className="font-sans text-[13px] text-[var(--ink-mid)]">{stock.lastSale}</span>
            <span
              className="font-sans text-[12px] font-medium"
              style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
            >
              {positive ? "▲" : "▼"} {stock.pctChange}
            </span>
          </span>
        );
      })}
    </>
  );
}

export function StockTicker() {
  const { data: stocks } = useQuery(tickerQuery);

  if (!stocks || stocks.length === 0) return null;

  return (
    <div className="w-full overflow-hidden border-b border-[var(--rule)] bg-[var(--paper)] py-2">
      <div
        className="flex w-max animate-marquee"
        style={{
          animationDuration: `${Math.max(30, stocks.length * 3)}s`,
        }}
      >
        <TickerRow items={stocks} />
        <TickerRow items={stocks} />
      </div>
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation-name: marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
