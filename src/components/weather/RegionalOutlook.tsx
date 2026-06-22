import { ArrowRight } from "lucide-react";
import type { ForecastResponse } from "@/lib/weather-api";

export function RegionalOutlook({ forecast }: { forecast: ForecastResponse }) {
  const daily = forecast.daily;
  const rainyDays = daily.weather_code.filter((c) => c >= 51).length;
  const maxTemp = Math.max(...daily.temperature_2m_max);
  const minTemp = Math.min(...daily.temperature_2m_min);

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-4">
      <h3 className="mb-2 font-serif text-lg text-[var(--ink)]">Regional Outlook</h3>
      <div className="mb-3 flex aspect-[21/9] items-center justify-center rounded border border-[var(--rule)] bg-[var(--rule)]/10">
        <svg viewBox="0 0 200 85" className="h-full w-full">
          <rect width="200" height="85" fill="#e8e8e3" />
          <path
            d="M20,70 Q50,55 80,62 T140,48 T180,40"
            fill="none"
            stroke="#b8b8b0"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="140" cy="48" r="4" fill="var(--ink-mid)" />
          <text x="148" y="52" fontSize="8" fill="var(--ink-mid)">
            You
          </text>
        </svg>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-mid)]">
        Highs around {Math.round(maxTemp)}°C and lows near {Math.round(minTemp)}°C.{" "}
        {rainyDays > 2
          ? `${rainyDays} days carry a meaningful chance of rain or storms.`
          : "Precipitation chances remain limited overall."}
      </p>
      <button className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-mid)] hover:text-[var(--ink)]">
        View full regional forecast <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
