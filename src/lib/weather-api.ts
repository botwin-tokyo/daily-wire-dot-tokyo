import { queryOptions } from "@tanstack/react-query";

const THIRTY_MINUTES = 30 * 60 * 1000;

export interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }
  const json = (await response.json()) as { results?: GeocodeResult[] };
  return json.results?.[0] ?? null;
}

export interface OpenMeteoCurrent {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
  precipitation_probability: number[];
  wind_speed_10m: number[];
}

export interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  wind_direction_10m_dominant: number[];
  wind_speed_10m_max?: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max?: number[];
}

export interface ForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: OpenMeteoCurrent;
  hourly: OpenMeteoHourly;
  daily: OpenMeteoDaily;
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastResponse> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m",
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,weather_code,precipitation_probability,wind_speed_10m",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_direction_10m_dominant,wind_speed_10m_max,sunrise,sunset,uv_index_max",
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "8");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Forecast fetch failed: ${response.status}`);
  }
  return (await response.json()) as ForecastResponse;
}

export interface WeatherData {
  forecast: ForecastResponse;
}

export async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
  const forecast = await fetchForecast(latitude, longitude);
  return { forecast };
}

export function weatherQueryOptions(latitude: number | null, longitude: number | null) {
  return queryOptions({
    queryKey: ["weather", "open-meteo", latitude, longitude],
    queryFn: () => {
      if (latitude == null || longitude == null) {
        throw new Error("Location is required");
      }
      return fetchWeatherData(latitude, longitude);
    },
    staleTime: THIRTY_MINUTES,
    enabled: latitude != null && longitude != null,
  });
}
