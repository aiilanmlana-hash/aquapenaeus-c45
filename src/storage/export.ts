import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { StoredReading } from "./index";

export async function exportReadingsCsv(readings: StoredReading[]): Promise<void> {
  const rows = [
    ["Waktu", "Kolam", "Perangkat", "Suhu C", "pH", "Salinitas ppt", "Klasifikasi", "Sumber"],
    ...readings.map((item) => [
      new Date(item.timestamp).toLocaleString("id-ID"),
      item.pond,
      item.id,
      item.temperature.toFixed(1),
      item.ph.toFixed(2),
      item.salinity.toFixed(1),
      item.classification,
      item.source,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const uri = `${FileSystem.documentDirectory}manero-log-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, `\uFEFF${csv}`, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Ekspor laporan Manero Aquaculture" });
  } else {
    throw new Error("Fitur berbagi file tidak tersedia di perangkat ini.");
  }
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
