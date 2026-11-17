import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StoredAlert, getCalibration, saveCalibration } from "../storage";
import { SplitPoints } from "../engine/c45";
import { colors, fonts, radius } from "../theme";
import { ActionButton, Card, Pill, SectionTitle } from "../components/FieldUI";
import { DeviceProps } from "./types";

export default function DeviceScreen({ deviceId, endpoint, onSave, alerts, onError, thresholds, onSaveThresholds }: DeviceProps) {
  const [id, setId] = useState(deviceId);
  const [url, setUrl] = useState(endpoint);
  const [calibration, setCalibration] = useState({ temperature: "0.0", ph: "0.00", salinity: "0.0" });
  const [splitValues, setSplitValues] = useState({ ph: String(thresholds.ph), temperature: String(thresholds.temperature), salinity: String(thresholds.salinity) });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setId(deviceId);
    setUrl(endpoint);
  }, [deviceId, endpoint]);
  useEffect(() => {
    setSplitValues({ ph: String(thresholds.ph), temperature: String(thresholds.temperature), salinity: String(thresholds.salinity) });
  }, [thresholds]);
  useEffect(() => {
    getCalibration().then((value) => setCalibration({
      temperature: value.temperature ?? "0.0",
      ph: value.ph ?? "0.00",
      salinity: value.salinity ?? "0.0",
    })).catch((error: unknown) => onError(`Gagal membaca kalibrasi: ${messageOf(error)}`));
  }, [onError]);

  async function persistCalibration() {
    try {
      await saveCalibration(calibration);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      onError(`Kalibrasi tidak tersimpan: ${messageOf(error)}`);
    }
  }
  async function persistDevice() {
    try {
      await onSave(id.trim(), url.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      onError(`Pengaturan perangkat tidak tersimpan: ${messageOf(error)}`);
    }
  }
  async function persistThresholds() {
    try {
      const parsed: SplitPoints = {
        ph: parseThreshold(splitValues.ph, "pH", 0, 14),
        temperature: parseThreshold(splitValues.temperature, "suhu", 0, 50),
        salinity: parseThreshold(splitValues.salinity, "salinitas", 0, 50),
      };
      await onSaveThresholds(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      onError(`Ambang tidak tersimpan: ${messageOf(error)}`);
    }
  }
  return <>
    <SectionTitle title="Perangkat ESP32" />
    <Card>
      <View style={styles.deviceHead}><View><Text style={styles.itemLabel}>ID PERANGKAT</Text><Text style={styles.deviceName}>{deviceId || "ESP32-MNR-A1"}</Text></View><Pill tone="neutral">REST / BRIDGE</Pill></View>
      <Text style={styles.inputLabel}>ID Perangkat</Text>
      <TextInput value={id} onChangeText={setId} autoCapitalize="characters" style={styles.input} placeholder="ESP32-MNR-A1" placeholderTextColor={colors.muted} />
      <Text style={styles.inputLabel}>Endpoint REST ESP32 / Gateway</Text>
      <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" style={styles.input} placeholder="http://alamat-perangkat/api/sensors" placeholderTextColor={colors.muted} />
      <Text style={styles.helper}>Payload JSON: {`{"temperature":29.4,"ph":7.9,"salinity":21}`}. Aktifkan mode simulasi untuk demo offline.</Text>
      <ActionButton label="Simpan koneksi" onPress={persistDevice} />
    </Card>
    <SectionTitle title="Kalibrasi probe" trailing="OFFSET MANUAL" />
    <Card>
      <CalibrationRow label="Suhu · DS18B20" unit="°C" value={calibration.temperature} onChange={(v) => setCalibration((old) => ({ ...old, temperature: v }))} />
      <CalibrationRow label="Probe pH" unit="pH" value={calibration.ph} onChange={(v) => setCalibration((old) => ({ ...old, ph: v }))} />
      <CalibrationRow label="Probe salinitas" unit="ppt" value={calibration.salinity} onChange={(v) => setCalibration((old) => ({ ...old, salinity: v }))} />
      <Text style={styles.helper}>Offset disimpan lokal sebagai catatan kalibrasi. Terapkan nilai offset pada firmware / gateway ESP32 sebelum mengirim data produksi.</Text>
      <ActionButton label={saved ? "Tersimpan ✓" : "Simpan offset"} onPress={persistCalibration} secondary />
    </Card>
    <SectionTitle title="Ambang pohon C4.5" />
    <Card>
      <Threshold label="Root · pH air" value={splitValues.ph} onChange={(v) => setSplitValues((old) => ({ ...old, ph: v }))} ideal="rentang ideal 7.5–8.5" />
      <Threshold label="Internal · suhu" value={splitValues.temperature} onChange={(v) => setSplitValues((old) => ({ ...old, temperature: v }))} ideal="rentang ideal 28–32°C" />
      <Threshold label="Leaf · salinitas" value={splitValues.salinity} onChange={(v) => setSplitValues((old) => ({ ...old, salinity: v }))} ideal="rentang ideal 15–25 ppt" last />
      <Text style={styles.helper}>Perubahan ambang diterapkan ke evaluator C4.5 dan simulator What‑If. Nilai split perlu divalidasi ulang terhadap data lapangan.</Text>
      <ActionButton label={saved ? "Tersimpan ✓" : "Simpan ambang"} onPress={persistThresholds} secondary />
    </Card>
    <SectionTitle title="Riwayat alert" trailing={`${alerts.length} TOTAL`} />
    <Card style={styles.alertCard}>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
        {alerts.length ? alerts.slice(0, 30).map((alert) => <AlertRow key={alert.id} alert={alert} />) : <Text style={styles.empty}>Belum ada alert. Alert dibuat saat status klasifikasi berubah menjadi TIDAK BAGUS.</Text>}
      </ScrollView>
    </Card>
  </>;
}

function CalibrationRow({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.calibrationRow}><View><Text style={styles.calLabel}>{label}</Text><Text style={styles.calUnit}>Offset ({unit})</Text></View><TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.offsetInput} /></View>;
}

function Threshold({ label, value, ideal, last = false, onChange }: { label: string; value: string; ideal: string; last?: boolean; onChange: (value: string) => void }) {
  return <View style={[styles.threshold, last && styles.noBorder]}><View><Text style={styles.thresholdLabel}>{label}</Text><Text style={styles.thresholdHint}>{ideal}</Text></View><TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.offsetInput} /></View>;
}

function AlertRow({ alert }: { alert: StoredAlert }) {
  return <View style={styles.alertRow}><View style={[styles.alertMark, { backgroundColor: alert.severity === "danger" ? colors.rust : colors.amber }]} /><View style={styles.alertCopy}><Text style={styles.alertMessage}>{alert.message}</Text><Text style={styles.alertTime}>{new Date(alert.timestamp).toLocaleString("id-ID")}</Text></View><Pill tone={alert.severity === "danger" ? "danger" : "warning"}>{alert.severity === "danger" ? "BAHAYA" : "WASPADA"}</Pill></View>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseThreshold(value: string, label: string, min: number, max: number): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`Ambang ${label} harus berupa angka antara ${min}–${max}.`);
  return parsed;
}

const styles = StyleSheet.create({
  deviceHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  itemLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9 },
  deviceName: { color: colors.ink, fontFamily: fonts.mono, fontSize: 13, marginTop: 4 },
  inputLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10, marginTop: 10, marginBottom: 5 },
  input: { minHeight: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, color: colors.ink, fontFamily: fonts.mono, fontSize: 11, marginBottom: 7 },
  helper: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 8, marginBottom: 12 },
  calibrationRow: { minHeight: 54, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border },
  calLabel: { color: colors.ink, fontFamily: fonts.medium, fontSize: 11 },
  calUnit: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 3 },
  offsetInput: { width: 88, textAlign: "right", color: colors.ink, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 7, fontFamily: fonts.mono, fontSize: 12 },
  threshold: { minHeight: 55, borderBottomWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noBorder: { borderBottomWidth: 0 },
  thresholdLabel: { color: colors.ink, fontFamily: fonts.medium, fontSize: 11 },
  thresholdHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 3 },
  thresholdValue: { color: colors.teal, fontFamily: fonts.mono, fontSize: 11 },
  alertCard: { padding: 0, overflow: "hidden" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderBottomWidth: 1, borderColor: colors.border },
  alertMark: { width: 8, height: 8, borderRadius: 4 },
  alertCopy: { flex: 1 },
  alertMessage: { color: colors.ink, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  alertTime: { color: colors.muted, fontFamily: fonts.mono, fontSize: 8, marginTop: 3 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, padding: 15, lineHeight: 16 },
});
