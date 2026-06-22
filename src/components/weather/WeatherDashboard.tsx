import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useLocalWeather } from "@/hooks/use-local-weather";
import { weatherQueryOptions } from "@/lib/weather-api";
import { formatFullDate } from "@/lib/weather-utils";
import { LocationSearch } from "./LocationSearch";
import { CurrentConditions } from "./CurrentConditions";
import { DailyForecast } from "./DailyForecast";
import { HourlyForecast } from "./HourlyForecast";
import { WeatherBriefing } from "./WeatherBriefing";
import { WeatherIndices } from "./WeatherIndices";
import { PrecipitationChart } from "./PrecipitationChart";
import { RegionalOutlook } from "./RegionalOutlook";
import { MoonPhaseWidget } from "./MoonPhase";

const LOCATION_KEY = "tmw.weather-location";

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  city: string;
}

export function WeatherDashboard() {
  const { data: deviceLocation, loading: deviceLoading, error: deviceError } = useLocalWeather();
  const [manualLocation, setManualLocation] = useState<ResolvedLocation | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);
      if (saved) setManualLocation(JSON.parse(saved) as ResolvedLocation);
    } catch {
      // ignore
    }
  }, []);

  const activeLocation: ResolvedLocation | null =
    manualLocation ??
    (deviceLocation
      ? {
          latitude: deviceLocation.latitude,
          longitude: deviceLocation.longitude,
          city: deviceLocation.city,
        }
      : null);

  const {
    data: weather,
    isLoading: weatherLoading,
    error: weatherError,
    refetch,
  } = useQuery(
    weatherQueryOptions(activeLocation?.latitude ?? null, activeLocation?.longitude ?? null),
  );

  function handleSelectLocation(location: ResolvedLocation) {
    setManualLocation(location);
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  }

  function handleChangeLocation() {
    setManualLocation(null);
    localStorage.removeItem(LOCATION_KEY);
    window.location.reload();
  }

  if (!activeLocation || deviceError) {
    return (
      <div className="py-12">
        <LocationSearch
          onSelect={handleSelectLocation}
          onRetryGeolocation={handleChangeLocation}
          error={deviceError}
          loading={deviceLoading}
        />
      </div>
    );
  }

  if (weatherLoading || deviceLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ink-mid)]" />
      </div>
    );
  }

  if (weatherError) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700">
          {weatherError instanceof Error ? weatherError.message : "Failed to load weather data."}
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const forecast = weather.forecast;
  const locationLabel =
    activeLocation.city || `${forecast.latitude.toFixed(2)}, ${forecast.longitude.toFixed(2)}`;
  const today = new Date(forecast.current.time);

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-2 border-b border-[var(--rule)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--ink)]">7-Day Forecast</h1>
          <p className="text-sm text-[var(--ink-mid)]">
            {locationLabel} · {formatFullDate(today)}
          </p>
        </div>
        <button
          onClick={handleChangeLocation}
          className="self-start text-sm text-[var(--ink-mid)] underline hover:text-[var(--ink)] md:self-auto"
        >
          Change location
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CurrentConditions forecast={forecast} locationLabel={locationLabel} />
          <DailyForecast daily={forecast.daily} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <HourlyForecast hourly={forecast.hourly} />
            <PrecipitationChart daily={forecast.daily} />
          </div>
        </div>

        <div className="space-y-6">
          <WeatherBriefing daily={forecast.daily} currentTemp={forecast.current.temperature_2m} />
          <WeatherIndices uv={forecast.daily.uv_index_max?.[0] ?? 5} />
          <RegionalOutlook forecast={forecast} />
          <MoonPhaseWidget />
        </div>
      </div>
    </div>
  );
}
