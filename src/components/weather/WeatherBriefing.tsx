import { Thermometer, CloudRain, Sun, Wind } from "lucide-react";
import { generateBriefing, type BriefingPoint } from "@/lib/weather-utils";
import type { OpenMeteoDaily } from "@/lib/weather-api";

const iconMap = {
  thermometer: Thermometer,
  "cloud-rain": CloudRain,
  sun: Sun,
  wind: Wind,
};

export function WeatherBriefing({
  daily,
  currentTemp,
}: {
  daily: OpenMeteoDaily;
  currentTemp: number;
}) {
  const points = generateBriefing(daily, currentTemp);

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h3 className="mb-4 font-serif text-lg text-[var(--ink)]">Morning Weather Briefing</h3>
      <ul className="space-y-4">
        {points.map((point: BriefingPoint) => {
          const Icon = iconMap[point.icon];
          return (
            <li key={point.title} className="flex gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink-mid)]" strokeWidth={1.5} />
              <div>
                <div className="font-semibold text-[var(--ink)]">{point.title}</div>
                <div className="text-sm leading-relaxed text-[var(--ink-mid)]">{point.text}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
