import React, { useMemo, useState } from "react";
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";
import { entropy, evaluateWater, gainRatio, giniImpurity, informationGain, referenceTrainingSet, SensorValues, SplitPoints } from "../engine/c45";
import { Card, DecisionTreeVisualizer, Pill, SectionTitle } from "../components/FieldUI";
import { colors, fonts } from "../theme";
import { AnalysisProps } from "./types";

export default function AnalysisScreen({ values, thresholds }: AnalysisProps) {
  const [whatIf, setWhatIf] = useState(values);
  const decision = useMemo(() => evaluateWater(whatIf, thresholds), [whatIf, thresholds]);
  const baseEntropy = entropy(referenceTrainingSet.map((row) => row.label));
  const metrics = [
    { name: "pH", key: "ph" as const, split: thresholds.ph },
    { name: "Suhu Air", key: "temperature" as const, split: thresholds.temperature },
    { name: "Salinitas", key: "salinity" as const, split: thresholds.salinity },
  ];
  function update(key: keyof SensorValues, value: number) {
    setWhatIf((previous) => ({ ...previous, [key]: value }));
  }
  return <>
    <Card style={styles.intro}>
      <Pill tone="neutral">C4.5 · ID3 + GAIN RATIO</Pill>
      <Text style={styles.introTitle}>Pohon keputusan tambak</Text>
      <Text style={styles.body}>Ambang diskretisasi mengikuti split Gini yang dirujuk dari Iqbal et al. (2020). Entropy dan Information Gain dihitung dari dataset referensi contoh pada aplikasi ini.</Text>
    </Card>
    <SectionTitle title="Jalur keputusan aktif" />
    <DecisionTreeVisualizer decision={decision} />
    <SectionTitle title="Entropy & Information Gain" trailing="DATASET REFERENSI" />
    <Card style={styles.table}>
      <View style={styles.tableHeader}><Text style={[styles.tableLabel, styles.attrColumn]}>ATRIBUT / SPLIT</Text><Text style={styles.tableLabel}>GAIN</Text><Text style={styles.tableLabel}>RATIO</Text><Text style={styles.tableLabel}>GINI</Text></View>
      {metrics.map((metric, index) => {
        const gain = informationGain(referenceTrainingSet, metric.key, metric.split);
        const ratio = gainRatio(referenceTrainingSet, metric.key, metric.split);
        const lower = referenceTrainingSet.filter((row) => row[metric.key] < metric.split).map((row) => row.label);
        const upper = referenceTrainingSet.filter((row) => row[metric.key] >= metric.split).map((row) => row.label);
        const gini = (lower.length / referenceTrainingSet.length) * giniImpurity(lower) + (upper.length / referenceTrainingSet.length) * giniImpurity(upper);
        return <View style={[styles.tableRow, index === metrics.length - 1 && styles.noBorder]} key={metric.key}>
          <View style={styles.attrColumn}><Text style={styles.attrName}>{metric.name}</Text><Text style={styles.attrSplit}>{`< ${metric.split}`}</Text></View>
          <Text style={styles.number}>{gain.toFixed(3)}</Text><Text style={styles.number}>{ratio.toFixed(3)}</Text><Text style={styles.number}>{gini.toFixed(3)}</Text>
        </View>;
      })}
      <Text style={styles.entropyFoot}>Entropy dataset: {baseEntropy.toFixed(3)} bit · n={referenceTrainingSet.length}</Text>
    </Card>
    <SectionTitle title="Simulator What‑If" trailing="UJI MANUAL" />
    <Card>
      <Text style={styles.body}>Geser nilai sensor untuk melihat perubahan kelas tanpa mengubah pembacaan perangkat.</Text>
      <Control label="pH air" value={whatIf.ph} min={6.5} max={9} step={0.01} unit="" onChange={(v) => update("ph", v)} />
      <Control label="Suhu air" value={whatIf.temperature} min={24} max={36} step={0.1} unit="°C" onChange={(v) => update("temperature", v)} />
      <Control label="Salinitas" value={whatIf.salinity} min={10} max={35} step={0.1} unit="ppt" onChange={(v) => update("salinity", v)} />
      <View style={styles.result}><Text style={styles.resultLabel}>HASIL SIMULASI</Text><Pill tone={decision.classification === "BAGUS" ? "good" : "danger"}>{decision.classification}</Pill></View>
      <Text style={styles.recommendation}>{decision.recommendation}</Text>
    </Card>
    <Text style={styles.disclaimer}>Catatan: dataset referensi 10 baris merupakan contoh demonstrasi, bukan dataset penelitian asli. Validasi ambang serta rekomendasi dengan data lapangan dan SOP teknis.</Text>
  </>;
}

function Control({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  return <View style={styles.control}>
    <View style={styles.controlHead}><Text style={styles.controlLabel}>{label}</Text><Text style={styles.controlValue}>{value.toFixed(step < 0.1 ? 2 : 1)} {unit}</Text></View>
    <Slider minimumValue={min} maximumValue={max} step={step} value={value} onValueChange={onChange} minimumTrackTintColor={colors.teal} maximumTrackTintColor={colors.border} thumbTintColor={colors.teal} />
    <View style={styles.sliderEnds}><Text style={styles.sliderEnd}>{min}</Text><Text style={styles.sliderEnd}>{max}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  intro: { borderLeftWidth: 4, borderLeftColor: colors.teal },
  introTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 17, marginTop: 12 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 7 },
  table: { paddingVertical: 4 },
  tableHeader: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  tableLabel: { width: "18%", textAlign: "right", color: colors.muted, fontFamily: fonts.bold, fontSize: 8 },
  tableRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, borderBottomWidth: 1, borderColor: colors.border },
  noBorder: { borderBottomWidth: 0 },
  attrColumn: { width: "46%", textAlign: "left" },
  attrName: { color: colors.ink, fontFamily: fonts.medium, fontSize: 11 },
  attrSplit: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9, marginTop: 2 },
  number: { color: colors.ink, fontFamily: fonts.mono, fontSize: 10, width: "18%", textAlign: "right", fontVariant: ["tabular-nums"] },
  entropyFoot: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  control: { marginTop: 16 },
  controlHead: { flexDirection: "row", justifyContent: "space-between" },
  controlLabel: { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
  controlValue: { color: colors.teal, fontFamily: fonts.mono, fontSize: 12, fontVariant: ["tabular-nums"] },
  sliderEnds: { flexDirection: "row", justifyContent: "space-between", marginTop: -7 },
  sliderEnd: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9 },
  result: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, borderTopWidth: 1, borderColor: colors.border, paddingTop: 14 },
  resultLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 9 },
  recommendation: { color: colors.ink, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, marginTop: 10 },
  disclaimer: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 4, marginBottom: 18 },
});
