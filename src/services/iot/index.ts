import { SensorValues } from "../../engine/c45";

export type SensorReading = SensorValues & {
  id: string;
  pond: string;
  timestamp: string;
  source: "SIMULASI" | "ESP32 REST";
};

export type SensorConfig = { endpoint: string; deviceId: string; intervalSeconds: number };

export function simulatedReading(previous?: SensorValues, pond = "Manero - Kolam A1"): SensorReading {
  const variation = () => (Math.random() - 0.5);
  return {
    id: `ESP32-MNR-${pond.endsWith("A2") ? "A2" : "A1"}`,
    pond,
    timestamp: new Date().toISOString(),
    source: "SIMULASI",
    temperature: clamp((previous?.temperature ?? 29.4) + variation() * 0.5, 27.1, 33.2, 1),
    ph: clamp((previous?.ph ?? 7.9) + variation() * 0.12, 6.8, 8.8, 2),
    salinity: clamp((previous?.salinity ?? 21) + variation() * 1.4, 12, 28, 1),
  };
}

export async function fetchEsp32Reading(config: SensorConfig, pond: string): Promise<SensorReading> {
  if (!config.endpoint.trim()) throw new Error("URL REST ESP32 belum diatur.");
  const response = await fetch(config.endpoint.trim());
  if (!response.ok) throw new Error(`ESP32 REST merespons HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Data ESP32 tidak valid.");
  const data = payload as Record<string, unknown>;
  const temperature = Number(data.temperature ?? data.suhu);
  const ph = Number(data.ph);
  const salinity = Number(data.salinity ?? data.salinitas);
  if (![temperature, ph, salinity].every(Number.isFinite)) throw new Error("Payload ESP32 harus memiliki temperature, ph, dan salinity numerik.");
  return {
    id: String(data.deviceId ?? config.deviceId ?? "ESP32-MNR-A1"),
    pond,
    timestamp: new Date().toISOString(),
    source: "ESP32 REST",
    temperature,
    ph,
    salinity,
  };
}

function clamp(value: number, min: number, max: number, digits: number): number {
  const bounded = Math.min(max, Math.max(min, value));
  return Number(bounded.toFixed(digits));
}
