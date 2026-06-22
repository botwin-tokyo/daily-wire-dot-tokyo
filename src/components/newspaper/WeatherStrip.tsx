import { Cloud, CloudRain, Loader2, Sun, CloudSun } from "lucide-react";
import { FitText } from "@/components/pretext";
import { useLocalWeather } from "@/hooks/use-local-weather";
import type { NewspaperWeatherSnapshot, NewspaperMarketTicker } from "@/lib/types";

const iconMap = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: Cloud,
  partly: CloudSun,
} as const;

export function WeatherStrip({
  weather,
  commodities,
}: {
  weather: NewspaperWeatherSnapshot;
  commodities: NewspaperMarketTicker[];
}) {
  const { data: local, loading } = useLocalWeather();

  const cells = local ? [local, ...weather.cities] : weather.cities;

  return (
    <section className="border-y border-[var(--ink)] bg-[var(--paper)]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 px-6 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <h3 className="eyebrow eyebrow-red">
              <FitText
                text="Weather Overview"
                minFontSize={10}
                maxFontSize={12}
                maxLines={1}
                lineHeightRatio={1}
                fontFamily='"Source Sans 3", system-ui, Arial, sans-serif'
                fontWeight={700}
              />
            </h3>
            <p className="meta">Source: {weather.sourceName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
            {loading && !local && (
              <div className="flex items-center gap-2.5">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--ink-mid)]" strokeWidth={1.4} />
                <div className="font-sans text-[12px] leading-tight text-[var(--ink-mid)]">
                  Locating you…
                </div>
              </div>
            )}
            {cells.map((w, index) => {
              const Icon = iconMap[w.icon];
              const isLocal = index === 0 && local != null;
              return (
                <div key={`${w.city}-${index}`} className="flex items-center gap-2.5">
                  <Icon className="h-5 w-5 text-[var(--ink-mid)]" strokeWidth={1.4} />
                  <div className="font-sans text-[12px] leading-tight">
                    <div className="text-[var(--ink-mid)]">
                      {w.city}
                      {isLocal && (
                        <span className="ml-1 text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                          Local
                        </span>
                      )}
                    </div>
                    <div className="text-[var(--ink)] font-semibold">{w.tempC}°C</div>
                    <div className="text-[var(--ink-faint)]">{w.condition}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-[var(--rule)] pt-4 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          {commodities.map((c) => (
            <div key={c.symbol}>
              <div className="eyebrow">
                {c.symbol.split(" ")[0] === "Brent" ? "Energy" : c.symbol.split(" ")[0]}
              </div>
              <div className="font-serif text-[15px]">{c.symbol}</div>
              <div className="font-mono text-[13px]">
                <span className="text-[var(--ink)]">{c.value}</span>
                <span
                  className="ml-2"
                  style={{ color: c.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {c.changePct >= 0 ? "+" : ""}
                  {c.changePct}% {c.changePct >= 0 ? "▲" : "▼"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
