import { useQuery, queryOptions } from "@tanstack/react-query";
import type { CryptoTickerItem } from "@/routes/api/crypto-ticker";

const tickerQuery = queryOptions({
  queryKey: ["crypto-ticker"],
  queryFn: async () => {
    const res = await fetch("/api/crypto-ticker");
    if (!res.ok) throw new Error("Failed to load crypto ticker");
    return (await res.json()) as CryptoTickerItem[];
  },
  refetchInterval: 60_000,
  staleTime: 30_000,
});

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 6 : 2,
  });
}

function TickerRow({ items }: { items: CryptoTickerItem[] }) {
  return (
    <>
      {items.map((coin) => {
        const change = coin.price_change_percentage_24h ?? 0;
        const positive = change >= 0;
        return (
          <span key={coin.id} className="inline-flex items-center gap-2 whitespace-nowrap px-4">
            <img
              src={coin.image}
              alt={coin.name}
              width={16}
              height={16}
              className="h-4 w-4 rounded-full"
            />
            <span className="font-sans text-[13px] font-semibold text-[var(--ink)]">
              {coin.symbol.toUpperCase()}
            </span>
            <span className="font-sans text-[13px] text-[var(--ink-mid)]">
              {formatPrice(coin.current_price)}
            </span>
            <span
              className="font-sans text-[12px] font-medium"
              style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
            >
              {positive ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </span>
          </span>
        );
      })}
    </>
  );
}

export function CryptoTicker() {
  const { data: coins } = useQuery(tickerQuery);

  if (!coins || coins.length === 0) return null;

  return (
    <div className="w-full overflow-hidden border-b border-[var(--rule)] bg-[var(--paper)] py-2">
      <div
        className="flex w-max animate-marquee"
        style={{
          animationDuration: `${Math.max(30, coins.length * 3)}s`,
        }}
      >
        <TickerRow items={coins} />
        <TickerRow items={coins} />
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
