import { Decision, SensorValues, SplitPoints } from "../engine/c45";
import { SensorReading } from "../services/iot";
import { StoredAlert, StoredReading } from "../storage";

export type PantauProps = {
  reading: SensorReading;
  decision: Decision;
  simulated: boolean;
  online: boolean;
  onToggleSimulation: () => void;
  lastUpdated: string;
};

export type AnalysisProps = { values: SensorValues; thresholds: SplitPoints };
export type HistoryProps = { readings: StoredReading[]; onExport: () => void };
export type DeviceProps = {
  deviceId: string;
  endpoint: string;
  onSave: (deviceId: string, endpoint: string) => Promise<void>;
  alerts: StoredAlert[];
  onError: (message: string) => void;
  thresholds: SplitPoints;
  onSaveThresholds: (thresholds: SplitPoints) => Promise<void>;
};
