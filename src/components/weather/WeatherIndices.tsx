import { aqiDescription, uvDescription, pollenDescription } from "@/lib/weather-utils";

function Donut({
  value,
  max,
  color,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--rule)" strokeWidth="5" />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold text-[var(--ink)]">
            {Math.round(value)}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
        <div className="text-xs text-[var(--ink-faint)]">{sublabel}</div>
      </div>
    </div>
  );
}

export function WeatherIndices({
  aqi,
  uv,
  pollen,
}: {
  aqi?: number;
  uv?: number;
  pollen?: number;
}) {
  const aqiInfo = aqiDescription(aqi ?? 0);
  const uvInfo = uvDescription(uv ?? 0);
  const pollenInfo = pollenDescription(pollen ?? 4.7);

  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-6">
      <h3 className="mb-4 font-serif text-lg text-[var(--ink)]">Today's Indices</h3>
      <div className="flex justify-around">
        <Donut
          value={aqi ?? 32}
          max={200}
          color={aqiInfo.color}
          label="AQI (US)"
          sublabel={aqiInfo.label}
        />
        <Donut
          value={uv ?? 5}
          max={11}
          color={uvInfo.color}
          label="UV Index"
          sublabel={uvInfo.label}
        />
        <Donut
          value={pollen ?? 4.7}
          max={10}
          color={pollenInfo.color}
          label="Pollen"
          sublabel={pollenInfo.label}
        />
      </div>
      <p className="mt-4 text-[10px] text-[var(--ink-faint)]">
        Pollen data is a placeholder until a free pollen source is integrated.
      </p>
    </div>
  );
}
