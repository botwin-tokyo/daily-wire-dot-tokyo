import { Navigation } from "lucide-react";
import { mapWeatherCode, degreesToCardinal, formatDay, formatDate } from "@/lib/weather-utils";
import type { OpenMeteoDaily } from "@/lib/weather-api";

export function DailyForecast({ daily }: { daily: OpenMeteoDaily }) {
  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h2 className="mb-4 font-serif text-2xl text-[var(--ink)]">7-Day Forecast</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
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
              className="flex flex-col items-center rounded border border-[var(--rule)] p-3 text-center"
            >
              <div className="text-xs font-bold uppercase text-[var(--ink-mid)]">
                {formatDay(date)}
              </div>
              <div className="text-xs text-[var(--ink-faint)]">{formatDate(date)}</div>
              <Icon className="my-2 h-8 w-8 text-[var(--ink-mid)]" strokeWidth={1.4} />
              <div className="text-xs leading-tight text-[var(--ink-mid)]">{mapped.condition}</div>
              <div className="my-1 font-mono text-sm text-[var(--ink)]">
                {maxTemp}° / <span className="text-[var(--ink-faint)]">{minTemp}°</span>
              </div>
              <div className="text-xs text-[var(--ink-faint)]">{rainProb}% rain</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--ink-faint)]">
                <Navigation className="h-3 w-3" style={{ transform: `rotate(${windDir}deg)` }} />
                {Math.round(windSpeed)} km/h {degreesToCardinal(windDir)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
