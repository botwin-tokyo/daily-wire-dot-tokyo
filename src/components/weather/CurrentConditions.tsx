import { Droplets, Wind, Sunrise, Sunset, Navigation } from "lucide-react";
import { mapWeatherCode, degreesToCardinal, formatTime } from "@/lib/weather-utils";
import type { ForecastResponse } from "@/lib/weather-api";

export function CurrentConditions({
  forecast,
  locationLabel,
}: {
  forecast: ForecastResponse;
  locationLabel: string;
}) {
  const current = forecast.current;
  const today = forecast.daily;
  const mapped = mapWeatherCode(current.weather_code);
  const Icon = mapped.lucide;

  const feelsLike = current.temperature_2m;
  const sunrise = today.sunrise[0];
  const sunset = today.sunset[0];

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <div className="mb-1 text-sm uppercase tracking-wider text-[var(--ink-mid)]">
        Current Conditions
      </div>
      <div className="mb-4 text-2xl font-serif text-[var(--ink)]">{locationLabel}</div>

      <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Icon className="h-20 w-20 text-[var(--ink-mid)]" strokeWidth={1.2} />
          <div>
            <div className="text-6xl font-serif font-light text-[var(--ink)]">
              {Math.round(current.temperature_2m)}°
            </div>
            <div className="text-lg text-[var(--ink-mid)]">{mapped.condition}</div>
            <div className="text-sm text-[var(--ink-faint)]">
              Feels like {Math.round(feelsLike)}°C
            </div>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 md:w-auto md:min-w-[280px]">
          <div className="flex items-center gap-2.5 rounded border border-[var(--rule)] p-3">
            <Droplets className="h-4 w-4 text-[var(--ink-mid)]" />
            <div>
              <div className="text-xs text-[var(--ink-faint)]">Humidity</div>
              <div className="font-mono text-sm text-[var(--ink)]">
                {current.relative_humidity_2m}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded border border-[var(--rule)] p-3">
            <Wind className="h-4 w-4 text-[var(--ink-mid)]" />
            <div>
              <div className="text-xs text-[var(--ink-faint)]">Wind</div>
              <div className="font-mono text-sm text-[var(--ink)]">
                {Math.round(current.wind_speed_10m)} km/h{" "}
                <Navigation
                  className="inline-block h-3 w-3"
                  style={{ transform: `rotate(${current.wind_direction_10m}deg)` }}
                />{" "}
                {degreesToCardinal(current.wind_direction_10m)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded border border-[var(--rule)] p-3">
            <Sunrise className="h-4 w-4 text-[var(--ink-mid)]" />
            <div>
              <div className="text-xs text-[var(--ink-faint)]">Sunrise</div>
              <div className="font-mono text-sm text-[var(--ink)]">{formatTime(sunrise)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded border border-[var(--rule)] p-3">
            <Sunset className="h-4 w-4 text-[var(--ink-mid)]" />
            <div>
              <div className="text-xs text-[var(--ink-faint)]">Sunset</div>
              <div className="font-mono text-sm text-[var(--ink)]">{formatTime(sunset)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
