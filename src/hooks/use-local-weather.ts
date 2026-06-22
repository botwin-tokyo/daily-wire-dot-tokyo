import { useEffect, useState } from "react";

type WeatherIcon = "sun" | "cloud" | "rain" | "snow" | "partly";

export interface LocalWeather {
  city: string;
  tempC: number;
  condition: string;
  icon: WeatherIcon;
  latitude: number;
  longitude: number;
}

export type GeolocationPermission = "granted" | "denied" | "prompt" | null;

interface UseLocalWeatherResult {
  data: LocalWeather | null;
  loading: boolean;
  error: string | null;
  permission: GeolocationPermission;
}

function mapWeatherCode(code: number): { condition: string; icon: WeatherIcon } {
  if (code === 0) return { condition: "Clear sky", icon: "sun" };
  if (code === 1) return { condition: "Mainly clear", icon: "partly" };
  if (code === 2) return { condition: "Partly cloudy", icon: "partly" };
  if (code === 3) return { condition: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { condition: "Foggy", icon: "cloud" };
  if (code >= 51 && code <= 57) return { condition: "Drizzle", icon: "rain" };
  if (code >= 61 && code <= 67) return { condition: "Rain", icon: "rain" };
  if (code >= 71 && code <= 77) return { condition: "Snow", icon: "snow" };
  if (code >= 80 && code <= 82) return { condition: "Showers", icon: "rain" };
  if (code >= 85 && code <= 86) return { condition: "Snow showers", icon: "snow" };
  if (code >= 95) return { condition: "Thunderstorm", icon: "rain" };
  return { condition: "Partly cloudy", icon: "partly" };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

async function fetchCityName(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", "en");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[useLocalWeather] Reverse geocoding failed: ${response.status}`);
      return null;
    }

    const json = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };

    return json.city || json.locality || json.principalSubdivision || json.countryName || null;
  } catch (err) {
    console.error("[useLocalWeather] Failed to fetch city name:", err);
    return null;
  }
}

async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<{ tempC: number; condition: string; icon: WeatherIcon }> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current_weather", "true");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    current_weather?: {
      temperature: number;
      weathercode: number;
    };
  };

  const current = json.current_weather;
  if (!current) {
    throw new Error("Weather response missing current_weather");
  }

  const mapped = mapWeatherCode(current.weathercode);
  return {
    tempC: current.temperature,
    condition: mapped.condition,
    icon: mapped.icon,
  };
}

export function useLocalWeather(): UseLocalWeatherResult {
  const [data, setData] = useState<LocalWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<GeolocationPermission>(null);

  useEffect(() => {
    if (!isBrowser()) return;

    const geolocation = navigator.geolocation;
    if (!geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);

    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          setPermission(status.state as GeolocationPermission);
          status.addEventListener("change", () => {
            setPermission(status.state as GeolocationPermission);
          });
        })
        .catch(() => {
          // Permission API not supported or failed; continue anyway.
        });
    }

    geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const [weather, city] = await Promise.all([
            fetchWeather(latitude, longitude),
            fetchCityName(latitude, longitude),
          ]);
          setData({ city: city ?? "Local", ...weather, latitude, longitude });
          setPermission("granted");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[useLocalWeather] Failed to load local weather:", message);
          setError(message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("Location permission denied.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location unavailable.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out.");
        } else {
          setError(err.message || "Failed to get location.");
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }, []);

  return { data, loading, error, permission };
}
