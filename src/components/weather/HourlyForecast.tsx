import { Navigation } from "lucide-react";
import { mapWeatherCode, formatHour, degreesToCardinal } from "@/lib/weather-utils";
import type { OpenMeteoHourly } from "@/lib/weather-api";

export function HourlyForecast({ hourly }: { hourly: OpenMeteoHourly }) {
  const now = new Date();
  const currentHourIso = now.toISOString().slice(0, 13);

  // Take the next 24 hours starting from the current hour.
  const startIndex = Math.max(
    0,
    hourly.time.findIndex((t) => t.slice(0, 13) >= currentHourIso),
  );
  const slice = hourly.time.slice(startIndex, startIndex + 24);

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h3 className="mb-3 font-serif text-lg text-[var(--ink)]">Hourly Forecast</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {slice.map((time, offset) => {
          const i = startIndex + offset;
          const mapped = mapWeatherCode(hourly.weather_code[i]);
          const Icon = mapped.lucide;
          const temp = Math.round(hourly.temperature_2m[i]);
          const rain = hourly.precipitation_probability[i];
          const wind = hourly.wind_speed_10m[i];

          return (
            <div
              key={time}
              className="flex min-w-[76px] flex-col items-center rounded border border-[var(--rule)] p-2 text-center"
            >
              <div className="text-xs text-[var(--ink-mid)]">{formatHour(time)}</div>
              <Icon className="my-1 h-5 w-5 text-[var(--ink-mid)]" strokeWidth={1.4} />
              <div className="font-mono text-sm text-[var(--ink)]">{temp}°</div>
              <div className="text-[10px] text-[var(--ink-faint)]">{rain}% rain</div>
              <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-[var(--ink-faint)]">
                <Navigation className="h-2.5 w-2.5" />
                {Math.round(wind)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
