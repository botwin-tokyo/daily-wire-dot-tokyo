import { formatDay } from "@/lib/weather-utils";
import type { OpenMeteoDaily } from "@/lib/weather-api";

export function PrecipitationChart({ daily }: { daily: OpenMeteoDaily }) {
  const data = daily.time.map((time, i) => ({
    day: formatDay(new Date(time)).slice(0, 3),
    value: daily.precipitation_probability_max[i],
  }));
  const max = Math.max(10, ...data.map((d) => d.value));

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h3 className="mb-4 font-serif text-lg text-[var(--ink)]">Precipitation Forecast</h3>
      <div className="flex h-40 items-end gap-2">
        {data.map((d) => {
          const height = `${(d.value / max) * 100}%`;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full flex-1 flex items-end justify-center rounded-t bg-[var(--rule)]/20">
                <div
                  className="w-full rounded-t bg-[var(--ink-mid)]/60 transition-all"
                  style={{ height }}
                  title={`${d.day}: ${d.value}%`}
                />
              </div>
              <div className="text-[10px] text-[var(--ink-faint)]">{d.day}</div>
              <div className="text-[10px] font-mono text-[var(--ink)]">{d.value}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
