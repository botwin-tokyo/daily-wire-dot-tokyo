import { Calendar, Cloud, CloudRain, CloudSun, Loader2, Sun } from "lucide-react";
import { useLocalWeather } from "@/hooks/use-local-weather";
import type { NewspaperUtilityBar } from "@/lib/types";

const iconMap = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: Cloud,
  partly: CloudSun,
} as const;

export function UtilityBar({ data }: { data: NewspaperUtilityBar }) {
  const { data: local, loading, error } = useLocalWeather();

  const weather = local ?? data.weather;
  const WeatherIcon = iconMap[weather.icon] ?? Cloud;

  return (
    <div className="border-b border-[var(--rule)] bg-[var(--paper)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-2 text-[12px] text-[var(--ink-mid)] font-sans">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
            {data.dateLabel}
          </span>
          <span className="text-[var(--rule)]">|</span>
          <span className="inline-flex items-center gap-1.5" title={error ?? weather.condition}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <WeatherIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            <span>
              <strong className="font-semibold text-[var(--ink)]">{weather.tempC}°C</strong>{" "}
              {weather.condition}
              {local && <span className="ml-1 text-[var(--ink-faint)]">· {local.city}</span>}
            </span>
          </span>
        </div>
        <div className="group relative hidden cursor-help md:block">
          <span className="border-b border-dashed border-[var(--ink-mid)] hover:text-[var(--ink)]">
            What Is Botwin's Morning Wire?
          </span>
          <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded border border-[var(--rule)] bg-[var(--paper)] p-4 text-left text-[13px] leading-relaxed text-[var(--ink)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Botwin's Morning Wire is your personal morning intelligence briefing — a curated,
            AI-assisted newspaper that aggregates global news, markets, science, culture, and
            weather into one clean, readable edition each day.
          </div>
        </div>
        <div className="hidden md:block font-mono text-[12px]">
          Updated by AI at {data.updatedByAiAt}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="pulse-dot inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--live-dot)" }}
            aria-hidden
          />
          <span>{data.nextEditionText}</span>
        </div>
      </div>
    </div>
  );
}
