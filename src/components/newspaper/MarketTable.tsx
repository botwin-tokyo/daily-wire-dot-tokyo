import type { NewspaperMarketSnapshot } from "@/lib/types";

export function MarketTable({ marketSnapshot }: { marketSnapshot: NewspaperMarketSnapshot }) {
  const updatedTime = new Date(marketSnapshot.updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border border-[var(--ink)] mt-4">
      <table className="w-full font-mono text-[13px]">
        <tbody>
          {marketSnapshot.tickers.map((m) => (
            <tr key={m.symbol} className="border-b border-[var(--rule)] last:border-b-0">
              <td className="px-2 py-1.5 font-sans font-semibold text-[var(--ink)]">{m.symbol}</td>
              <td className="px-2 py-1.5 text-right">{m.value}</td>
              <td
                className="px-2 py-1.5 text-right"
                style={{ color: m.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}
              >
                {m.changePct >= 0 ? "+" : ""}
                {m.changePct}% {m.changePct >= 0 ? "▲" : "▼"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="meta px-2 py-1.5 border-t border-[var(--rule)]">
        Markets as of {updatedTime} · Source: {marketSnapshot.sourceName}
      </p>
    </div>
  );
}
