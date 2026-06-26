import { describe, it, expect } from "vitest";
import {
  mapWeatherCode,
  degreesToCardinal,
  getMoonPhase,
  generateBriefing,
  aqiDescription,
  uvDescription,
} from "./weather-utils";

describe("mapWeatherCode", () => {
  it("maps clear sky", () => {
    const mapped = mapWeatherCode(0);
    expect(mapped.condition).toBe("Clear sky");
  });

  it("maps rain", () => {
    const mapped = mapWeatherCode(61);
    expect(mapped.condition).toBe("Rain");
  });

  it("maps thunderstorm", () => {
    const mapped = mapWeatherCode(95);
    expect(mapped.condition).toBe("Thunderstorm");
  });
});

describe("degreesToCardinal", () => {
  it("returns N for 0", () => {
    expect(degreesToCardinal(0)).toBe("N");
  });

  it("returns E for 90", () => {
    expect(degreesToCardinal(90)).toBe("E");
  });

  it("returns S for 180", () => {
    expect(degreesToCardinal(180)).toBe("S");
  });
});

describe("getMoonPhase", () => {
  it("returns a phase name and illumination", () => {
    const phase = getMoonPhase(new Date("2025-05-20"));
    expect(phase.name).toBeTruthy();
    expect(phase.illumination).toBeGreaterThanOrEqual(0);
    expect(phase.illumination).toBeLessThanOrEqual(100);
  });
});

describe("generateBriefing", () => {
  it("returns three briefing points", () => {
    const daily = {
      time: ["2025-05-20", "2025-05-21", "2025-05-22"],
      temperature_2m_max: [24, 25, 26],
      temperature_2m_min: [16, 17, 18],
      precipitation_probability_max: [10, 20, 30],
      weather_code: [0, 1, 2],
    };
    const points = generateBriefing(daily, 26);
    expect(points).toHaveLength(3);
  });
});

describe("aqiDescription", () => {
  it("labels good AQI", () => {
    expect(aqiDescription(32).label).toBe("Good");
  });

  it("labels moderate AQI", () => {
    expect(aqiDescription(75).label).toBe("Moderate");
  });
});

describe("uvDescription", () => {
  it("labels low UV", () => {
    expect(uvDescription(1).label).toBe("Low");
  });

  it("labels moderate UV", () => {
    expect(uvDescription(5).label).toBe("Moderate");
  });
});
