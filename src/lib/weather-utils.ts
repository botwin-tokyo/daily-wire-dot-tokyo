import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type WeatherIconKey =
  | "sun"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder"
  | "wind";

export interface WmoMapping {
  condition: string;
  icon: WeatherIconKey;
  lucide: LucideIcon;
}

export function mapWeatherCode(code: number): WmoMapping {
  if (code === 0) return { condition: "Clear sky", icon: "sun", lucide: Sun };
  if (code === 1) return { condition: "Mainly clear", icon: "partly", lucide: CloudSun };
  if (code === 2) return { condition: "Partly cloudy", icon: "partly", lucide: CloudSun };
  if (code === 3) return { condition: "Overcast", icon: "cloud", lucide: Cloud };
  if (code === 45 || code === 48) return { condition: "Fog", icon: "fog", lucide: CloudFog };
  if (code >= 51 && code <= 57)
    return { condition: "Drizzle", icon: "drizzle", lucide: CloudDrizzle };
  if (code >= 61 && code <= 67) return { condition: "Rain", icon: "rain", lucide: CloudRain };
  if (code >= 71 && code <= 77) return { condition: "Snow", icon: "snow", lucide: CloudSnow };
  if (code >= 80 && code <= 82) return { condition: "Showers", icon: "rain", lucide: CloudRain };
  if (code >= 85 && code <= 86)
    return { condition: "Snow showers", icon: "snow", lucide: CloudSnow };
  if (code >= 95) return { condition: "Thunderstorm", icon: "thunder", lucide: CloudLightning };
  return { condition: "Partly cloudy", icon: "partly", lucide: CloudSun };
}

export const weatherIconMap: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
  wind: Cloud,
};

export function getWeatherIcon(key: WeatherIconKey): LucideIcon {
  return weatherIconMap[key] ?? CloudSun;
}

export function degreesToCardinal(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatHour(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", { hour: "numeric" });
}

export interface MoonPhase {
  name: string;
  illumination: number;
}

export function getMoonPhase(date: Date = new Date()): MoonPhase {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  if (month < 3) {
    year--;
    month += 12;
  }
  const c = 365.25 * year;
  const e = 30.6 * month;
  let jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  const b = Math.trunc(jd);
  jd -= b;
  const phase = Math.round(jd * 29.53);

  const names = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
    "New Moon",
  ];
  const index = Math.floor(((phase + 1) / 30) * 8);
  const illumination = Math.round((1 - Math.cos((phase / 29.53) * 2 * Math.PI)) * 50);
  return { name: names[Math.min(index, 8)], illumination };
}

export interface BriefingPoint {
  title: string;
  text: string;
  icon: "thermometer" | "cloud-rain" | "sun" | "wind";
}

export function generateBriefing(
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  },
  currentTemp: number,
): BriefingPoint[] {
  const maxTemps = daily.temperature_2m_max;
  const minTemps = daily.temperature_2m_min;
  const rainChances = daily.precipitation_probability_max;
  const codes = daily.weather_code;

  const avgHigh = maxTemps.reduce((a, b) => a + b, 0) / maxTemps.length;
  const avgLow = minTemps.reduce((a, b) => a + b, 0) / minTemps.length;
  const maxRain = Math.max(...rainChances);
  const rainyDays = codes.filter((c) => c >= 51).length;
  const warmestIndex = maxTemps.indexOf(Math.max(...maxTemps));

  const points: BriefingPoint[] = [];

  if (rainyDays >= 3 || maxRain > 60) {
    points.push({
      title: "Unsettled Midweek",
      text: `Scattered showers or storms are expected on ${rainyDays} of the next 7 days, with peak rain chances reaching ${maxRain}%.`,
      icon: "cloud-rain",
    });
  } else {
    points.push({
      title: "Mostly Dry Stretch",
      text: "High pressure should keep rain chances low for much of the week ahead.",
      icon: "sun",
    });
  }

  if (currentTemp > avgHigh) {
    points.push({
      title: "Above Average Temperatures",
      text: `Today's high is running warmer than the week's average of ${Math.round(avgHigh)}°C. Expect the warmest day around ${formatDate(new Date(daily.time[warmestIndex]))}.`,
      icon: "thermometer",
    });
  } else {
    points.push({
      title: "Seasonable Temps",
      text: `Highs will generally range from ${Math.round(Math.min(...maxTemps))}°C to ${Math.round(Math.max(...maxTemps))}°C this week.`,
      icon: "thermometer",
    });
  }

  if (maxTemps[maxTemps.length - 1] > avgHigh && rainChances[rainChances.length - 1] < 40) {
    points.push({
      title: "Weekend Improves",
      text: "The weekend is shaping up warmer and drier than the middle of the week.",
      icon: "sun",
    });
  } else {
    points.push({
      title: "Plan for Variability",
      text: "Keep an umbrella handy; conditions shift through the week with a mix of sun and showers.",
      icon: "wind",
    });
  }

  return points.slice(0, 3);
}

export function aqiDescription(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#22c55e" };
  if (aqi <= 100) return { label: "Moderate", color: "#eab308" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "#f97316" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#a855f7" };
  return { label: "Hazardous", color: "#7f1d1d" };
}

export function uvDescription(uv: number): { label: string; color: string } {
  if (uv <= 2) return { label: "Low", color: "#22c55e" };
  if (uv <= 5) return { label: "Moderate", color: "#eab308" };
  if (uv <= 7) return { label: "High", color: "#f97316" };
  if (uv <= 10) return { label: "Very High", color: "#ef4444" };
  return { label: "Extreme", color: "#a855f7" };
}

export function pollenDescription(_value: number): { label: string; color: string } {
  // Placeholder until a pollen data source is integrated.
  return { label: "Moderate", color: "#eab308" };
}

export const precipitationIcon = Droplets;
