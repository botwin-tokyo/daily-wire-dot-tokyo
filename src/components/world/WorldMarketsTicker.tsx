import { useQuery, queryOptions } from "@tanstack/react-query";
import type { WorldMarketItem } from "@/routes/api/world-markets-ticker";

const tickerQuery = queryOptions({
  queryKey: ["world-markets-ticker"],
  queryFn: async () => {
    const res = await fetch("/api/world-markets-ticker");
    if (!res.ok) throw new Error("Failed to load world markets ticker");
    return (await res.json()) as WorldMarketItem[];
  },
  refetchInterval: 60_000,
  staleTime: 30_000,
});

function TickerRow({ items }: { items: WorldMarketItem[] }) {
  return (
    <>
      {items.map((market) => {
        const positive = market.changePct >= 0;
        return (
          <span
            key={market.symbol}
            className="inline-flex items-center gap-2 whitespace-nowrap px-4"
          >
            <span className="font-sans text-[13px] font-semibold text-[var(--ink)]">
              {market.name}
            </span>
            <span className="font-sans text-[13px] text-[var(--ink-mid)]">
              {market.price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className="font-sans text-[12px] font-medium"
              style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
            >
              {positive ? "▲" : "▼"} {Math.abs(market.changePct).toFixed(2)}%
            </span>
          </span>
        );
      })}
    </>
  );
}

export function WorldMarketsTicker() {
  const { data: markets } = useQuery(tickerQuery);

  if (!markets || markets.length === 0) return null;

  return (
    <div className="w-full overflow-hidden border-b border-[var(--rule)] bg-[var(--paper)] py-2">
      <div
        className="flex w-max animate-marquee"
        style={{
          animationDuration: `${Math.max(30, markets.length * 3)}s`,
        }}
      >
        <TickerRow items={markets} />
        <TickerRow items={markets} />
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
