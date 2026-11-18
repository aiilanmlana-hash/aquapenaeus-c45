import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { StoredReading } from "./index";

export async function exportReadingsCsv(readings: StoredReading[]): Promise<void> {
  const rows = [
    ["Aplikasi", "Aquapenaeus C4.5"],
    ["Lokasi", "Tambak Maneron (Maneron, Kec. Sepulu, Kab. Bangkalan, Madura)"],
    ["Siklus deteksi", "10 menit"],
    [],
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
  const uri = `${FileSystem.documentDirectory}aquapenaeus-c45-log-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, `\uFEFF${csv}`, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Ekspor laporan Aquapenaeus C4.5" });
  } else {
    throw new Error("Fitur berbagi file tidak tersedia di perangkat ini.");
  }
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
