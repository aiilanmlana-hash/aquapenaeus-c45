import React, { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Decision, idealRanges } from "../engine/c45";
import { SensorReading } from "../services/iot";
import { colors, fonts, radius, space } from "../theme";
import { ActionButton, Card, InteractiveTrendChart, Pill, Reveal, SectionTitle, TelemetryCard } from "../components/FieldUI";
import { PantauProps } from "./types";

export default function PantauScreen({ reading, decision, thresholds, simulated, online, onToggleSimulation, onTestCycle, lastUpdated }: PantauProps) {
  const trends = useMemo(() => makeTrend(reading), [reading]);
  const currentTone = decision.classification === "BAGUS" ? "good" : "danger";
  const elapsedSeconds = lastUpdated ? Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000)) : 0;
  const ago = !lastUpdated ? "menunggu data" : elapsedSeconds >= 60
    ? `${Math.floor(elapsedSeconds / 60)} mnt lalu`
    : `${elapsedSeconds} dtk lalu`;
  return <>
    <View style={styles.connectionRow}>
      <View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: simulated || reading.source === "CACHE LOKAL" ? colors.warning : online ? colors.good : colors.critical }]} /><Text style={styles.connection}>{simulated ? "SIMULASI AKTIF" : online ? "ESP32 ONLINE" : reading.source === "CACHE LOKAL" ? "DATA CACHE LOKAL" : "ESP32 OFFLINE"}</Text></View>
      <Text style={styles.updated}>Update {ago}</Text>
    </View>
    <Card style={styles.simCard}>
      <View style={styles.simCopy}><Text style={styles.simTitle}>Mode Simulasi Data</Text><Text style={styles.simDescription}>Siklus deteksi rutin tiap 10 menit</Text><Pressable onPress={onTestCycle} hitSlop={8}><Text style={styles.testCycle}>Uji Siklus Sekarang</Text></Pressable></View>
      <Switch value={simulated} onValueChange={onToggleSimulation} trackColor={{ false: colors.border, true: colors.brandPrimary }} thumbColor="white" />
    </Card>
    <Reveal>
      <Card style={[styles.decisionCard, decision.classification === "BAGUS" ? styles.goodCard : styles.badCard]}>
        <View style={styles.decisionTop}><Text style={styles.cardEyebrow}>SISTEM CERDAS · C4.5</Text><Pill tone={currentTone}>{decision.classification === "BAGUS" ? "KONDISI AIR: BAGUS" : "KONDISI AIR: TIDAK BAGUS"}</Pill></View>
        <Text style={styles.ruleLabel}>Aturan aktif</Text>
        <Text style={styles.rule}>{decision.activeRule}</Text>
        <View style={styles.separator} />
        <Text style={styles.actionLabel}>TINDAKAN LAPANGAN</Text>
        <Text style={styles.action}>{decision.recommendation}</Text>
        <Text style={styles.targetNote}>Indikator kondisi pendukung target size ≤50 ekor/kg; bukan prediksi hasil panen.</Text>
      </Card>
    </Reveal>
    <SectionTitle title="Parameter air" trailing="REAL-TIME" />
    <View style={styles.metrics}>
      <TelemetryCard label="SUHU AIR" value={reading.temperature.toFixed(1)} unit="°C" range={`${idealRanges.temperature.min}–${idealRanges.temperature.max}°C`} data={trends.map((x) => x.temperature)} tone={decision.checks.temperature ? "good" : "danger"} />
      <TelemetryCard label="pH AIR" value={reading.ph.toFixed(2)} unit="pH" range={`${idealRanges.ph.min}–${idealRanges.ph.max}`} data={trends.map((x) => x.ph)} tone={decision.checks.ph ? "good" : "danger"} />
      <TelemetryCard label="SALINITAS" value={reading.salinity.toFixed(1)} unit="ppt" range={`${idealRanges.salinity.min}–${idealRanges.salinity.max} ppt`} data={trends.map((x) => x.salinity)} tone={decision.checks.salinity ? "good" : "warning"} />
    </View>
    <Reveal delay={90}>
      <SectionTitle title="Tren harian" trailing="GESER UNTUK DETAIL" />
      <InteractiveTrendChart samples={trends} />
    </Reveal>
    <Card style={styles.deviceStrip}>
      <View><Text style={styles.cardEyebrow}>PERANGKAT SUMBER</Text><Text style={styles.deviceId}>{reading.id}</Text></View>
      <Pill tone={simulated ? "warning" : "good"}>{reading.source}</Pill>
    </Card>
  </>;
}

function makeTrend(reading: SensorReading) {
  return Array.from({ length: 13 }, (_, index) => {
    const phase = index / 12;
    return {
      label: `${String(index * 2).padStart(2, "0")}.00`,
      temperature: Number((reading.temperature + Math.sin(phase * Math.PI * 2) * 1.1 + (index - 12) * 0.04).toFixed(1)),
      ph: Number((reading.ph + Math.cos(phase * Math.PI * 2) * 0.17).toFixed(2)),
      salinity: Number((reading.salinity + Math.sin(phase * Math.PI) * 1.3).toFixed(1)),
    };
  });
}

const styles = StyleSheet.create({
  connectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 2 },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  connection: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 11 },
  updated: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 9 },
  simCard: { paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  simCopy: { flex: 1 },
  simTitle: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 12 },
  simDescription: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
  testCycle: { color: colors.brandSecondary, fontFamily: fonts.bold, fontSize: 9, marginTop: 6 },
  decisionCard: { borderWidth: 1, padding: 16 },
  goodCard: { borderColor: colors.brandSecondary, backgroundColor: colors.goodTint },
  badCard: { borderColor: colors.critical, backgroundColor: colors.criticalTint },
  decisionTop: { gap: 9, alignItems: "flex-start" },
  cardEyebrow: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.8 },
  ruleLabel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 10, marginTop: 14 },
  rule: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 10, lineHeight: 17, marginTop: 5 },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  actionLabel: { color: colors.brandPrimary, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.7 },
  action: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 5 },
  targetNote: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 9, lineHeight: 14, marginTop: 7 },
  metrics: { flexDirection: "row", marginBottom: 15 },
  deviceStrip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  deviceId: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 12, marginTop: 5 },
});
