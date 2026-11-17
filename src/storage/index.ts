import AsyncStorage from "@react-native-async-storage/async-storage";
import { SensorReading } from "../services/iot";
import { SplitPoints, splitPoints, WaterClass } from "../engine/c45";

const LOG_KEY = "@manero/readings-v1";
const ALERT_KEY = "@manero/alerts-v1";
const CONFIG_KEY = "@manero/device-config-v1";
const CALIBRATION_KEY = "@manero/calibration-v1";
const THRESHOLD_KEY = "@manero/c45-thresholds-v1";
const MAX_LOGS = 1500;

export type StoredReading = SensorReading & { classification: WaterClass };
export type StoredAlert = { id: string; timestamp: string; message: string; severity: "warning" | "danger" };

export async function getReadings(): Promise<StoredReading[]> {
  const value = await AsyncStorage.getItem(LOG_KEY);
  return value ? (JSON.parse(value) as StoredReading[]) : [];
}

export async function addReading(reading: StoredReading): Promise<void> {
  const existing = await getReadings();
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify([reading, ...existing].slice(0, MAX_LOGS)));
}

export async function getAlerts(): Promise<StoredAlert[]> {
  const value = await AsyncStorage.getItem(ALERT_KEY);
  return value ? (JSON.parse(value) as StoredAlert[]) : [];
}

export async function addAlert(alert: StoredAlert): Promise<void> {
  const existing = await getAlerts();
  await AsyncStorage.setItem(ALERT_KEY, JSON.stringify([alert, ...existing].slice(0, 250)));
}

export async function getDeviceConfig(): Promise<{ endpoint: string; deviceId: string }> {
  const value = await AsyncStorage.getItem(CONFIG_KEY);
  return value ? JSON.parse(value) as { endpoint: string; deviceId: string } : { endpoint: "", deviceId: "ESP32-MNR-A1" };
}

export async function saveDeviceConfig(config: { endpoint: string; deviceId: string }): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function getCalibration(): Promise<Record<string, string>> {
  const value = await AsyncStorage.getItem(CALIBRATION_KEY);
  return value ? JSON.parse(value) as Record<string, string> : { temperature: "0.0", ph: "0.00", salinity: "0.0" };
}

export async function saveCalibration(calibration: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
}

export async function getThresholds(): Promise<SplitPoints> {
  const value = await AsyncStorage.getItem(THRESHOLD_KEY);
  if (!value) return splitPoints;
  const parsed = JSON.parse(value) as Partial<SplitPoints>;
  const thresholds: SplitPoints = {
    ph: parsed.ph ?? splitPoints.ph,
    temperature: parsed.temperature ?? splitPoints.temperature,
    salinity: parsed.salinity ?? splitPoints.salinity,
  };
  if (![thresholds.ph, thresholds.temperature, thresholds.salinity].every(Number.isFinite)) {
    throw new Error("Konfigurasi ambang C4.5 tidak valid.");
  }
  return thresholds;
}

export async function saveThresholds(thresholds: SplitPoints): Promise<void> {
  await AsyncStorage.setItem(THRESHOLD_KEY, JSON.stringify(thresholds));
}
