import { Navigation } from "lucide-react";
import { mapWeatherCode, degreesToCardinal, formatDay, formatDate } from "@/lib/weather-utils";
import type { OpenMeteoDaily } from "@/lib/weather-api";

export function DailyForecast({ daily }: { daily: OpenMeteoDaily }) {
  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h2 className="mb-4 font-serif text-2xl text-[var(--ink)]">7-Day Forecast</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {daily.time.map((time, i) => {
          const date = new Date(time);
          const mapped = mapWeatherCode(daily.weather_code[i]);
          const Icon = mapped.lucide;
          const maxTemp = Math.round(daily.temperature_2m_max[i]);
          const minTemp = Math.round(daily.temperature_2m_min[i]);
          const rainProb = daily.precipitation_probability_max[i];
          const windSpeed = daily.wind_speed_10m_max?.[i] ?? 0;
          const windDir = daily.wind_direction_10m_dominant[i];

          return (
            <div
              key={time}
              className="flex min-w-[92px] flex-1 flex-col items-center rounded border border-[var(--rule)] px-2 py-3 text-center"
            >
              <div className="text-[10px] font-bold uppercase text-[var(--ink-mid)]">
                {formatDay(date)}
              </div>
              <div className="text-[10px] text-[var(--ink-faint)]">{formatDate(date)}</div>
              <Icon className="my-1.5 h-6 w-6 text-[var(--ink-mid)]" strokeWidth={1.4} />
              <div className="text-[10px] leading-tight text-[var(--ink-mid)]">
                {mapped.condition}
              </div>
              <div className="my-0.5 font-mono text-xs text-[var(--ink)]">
                {maxTemp}° / <span className="text-[var(--ink-faint)]">{minTemp}°</span>
              </div>
              <div className="text-[10px] text-[var(--ink-faint)]">{rainProb}% rain</div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-[var(--ink-faint)]">
                <Navigation
                  className="h-2.5 w-2.5"
                  style={{ transform: `rotate(${windDir}deg)` }}
                />
                {Math.round(windSpeed)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
