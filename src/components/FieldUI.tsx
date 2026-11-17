import React, { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Decision, SensorValues } from "../engine/c45";
import { colors, fonts, radius, space } from "../theme";

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, trailing }: { title: string; trailing?: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>{title}</Text>{trailing ? <Text style={styles.sectionTrailing}>{trailing}</Text> : null}</View>;
}

export function Pill({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "good" | "warning" | "danger" | "neutral" }>) {
  const toneStyle = tone === "good" ? styles.pillGood : tone === "warning" ? styles.pillWarning : tone === "danger" ? styles.pillDanger : styles.pillNeutral;
  return <View style={[styles.pill, toneStyle]}><Text style={styles.pillText}>{children}</Text></View>;
}

export function ActionButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, secondary ? styles.buttonSecondary : styles.buttonPrimary, pressed && styles.pressed]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}

export function Reveal({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 300, delay, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [delay, progress]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>{children}</Animated.View>;
}

export function TelemetryCard({ label, value, unit, range, data, tone }: {
  label: string; value: string; unit: string; range: string; data: number[]; tone: "good" | "warning" | "danger";
}) {
  const color = tone === "good" ? colors.green : tone === "warning" ? colors.amber : colors.rust;
  const points = data.map((item, index) => `${index * 24},${26 - (item - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1) * 20}`).join(" ");
  return <Card style={styles.telemetryCard}>
    <Text style={styles.cardLabel}>{label}</Text>
    <View style={styles.metricLine}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricUnit}>{unit}</Text></View>
    <Text style={styles.rangeText}>Ideal {range}</Text>
    <Svg width="100%" height={30} viewBox="0 0 120 30" preserveAspectRatio="none">
      <Line x1="0" y1="27" x2="120" y2="27" stroke={colors.border} strokeWidth="1" />
      <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
    <Text style={styles.sparkLabel}>6 jam terakhir</Text>
  </Card>;
}

export type TrendSample = SensorValues & { label: string };
export function InteractiveTrendChart({ samples }: { samples: TrendSample[] }) {
  const [selected, setSelected] = useState(samples.length - 1);
  const chartWidth = useRef(300);
  const selectedSample = samples[selected];
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => selectPoint(event.nativeEvent.locationX),
    onPanResponderMove: (event) => selectPoint(event.nativeEvent.locationX),
  }), [samples.length]);
  function selectPoint(x: number) {
    const fraction = Math.min(1, Math.max(0, x / chartWidth.current));
    setSelected(Math.round(fraction * (samples.length - 1)));
  }
  const chart = (key: "temperature" | "ph" | "salinity", color: string, top: number, bottom: number) => {
    const values = samples.map((sample) => sample[key]);
    const min = Math.min(...values, bottom);
    const max = Math.max(...values, top);
    const coords = values.map((value, index) => {
      const x = 20 + (index / (values.length - 1)) * 270;
      const y = 16 + (1 - (value - min) / (max - min || 1)) * 72;
      return `${x},${y}`;
    }).join(" ");
    const selectedX = 20 + (selected / (values.length - 1)) * 270;
    return <React.Fragment key={key}>
      <Path d={`M ${coords}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={selectedX} y1="8" x2={selectedX} y2="96" stroke={colors.muted} strokeWidth="1" strokeDasharray="4 4" />
      <Circle cx={selectedX} cy={Number(coords.split(" ")[selected].split(",")[1])} r="4" fill={color} stroke="white" strokeWidth="2" />
    </React.Fragment>;
  };
  return <Card>
    <View style={styles.scrubReadout}>
      <Text style={styles.scrubTime}>{selectedSample.label}</Text>
      <Text style={styles.scrubValue}>{selectedSample.temperature.toFixed(1)}°C  ·  {selectedSample.ph.toFixed(2)} pH  ·  {selectedSample.salinity.toFixed(1)} ppt</Text>
    </View>
    <View onLayout={(event) => { chartWidth.current = event.nativeEvent.layout.width; }} {...responder.panHandlers} style={styles.chartTouch}>
      <Svg width="100%" height={112} viewBox="0 0 300 112">
        <Rect x="18" y="23" width="274" height="50" fill={colors.greenSoft} opacity="0.55" />
        <Line x1="18" y1="16" x2="292" y2="16" stroke={colors.border} />
        <Line x1="18" y1="48" x2="292" y2="48" stroke={colors.border} strokeDasharray="3 4" />
        <Line x1="18" y1="88" x2="292" y2="88" stroke={colors.border} />
        {chart("temperature", colors.teal, 32, 27)}
        {chart("ph", colors.amber, 8.5, 7.0)}
        {chart("salinity", colors.green, 25, 14)}
      </Svg>
    </View>
    <View style={styles.chartAxis}><Text style={styles.axisText}>00.00</Text><Text style={styles.axisText}>06.00</Text><Text style={styles.axisText}>12.00</Text><Text style={styles.axisText}>18.00</Text><Text style={styles.axisText}>24.00</Text></View>
    <View style={styles.legend}><Legend color={colors.teal} label="Suhu" /><Legend color={colors.amber} label="pH" /><Legend color={colors.green} label="Salinitas" /><Text style={styles.zoneLabel}>Zona aman</Text></View>
  </Card>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.axisText}>{label}</Text></View>;
}

export function DecisionTreeVisualizer({ decision }: { decision: Decision }) {
  const active = decision.branches;
  const node = (title: string, detail: string, passed: boolean | undefined, root = false) => (
    <View style={[styles.treeNode, passed ? styles.treeNodeActive : styles.treeNodeIdle, root && styles.treeRoot]} key={title}>
      <Text style={[styles.treeLabel, passed && styles.treeLabelActive]}>{title}</Text><Text style={[styles.treeDetail, passed && styles.treeDetailActive]}>{detail}</Text>
    </View>
  );
  return <Card style={styles.treeCard}>
    {node("ROOT · pH", decision.path[0], true, true)}
    <View style={styles.treeStem} />
    {node("INTERNAL · SUHU", decision.path[1], active.ph)}
    <View style={styles.treeStem} />
    {node("LEAF · SALINITAS", decision.path[2], active.ph && active.temperature)}
    <View style={styles.treeStem} />
    <Pill tone={decision.classification === "BAGUS" ? "good" : "danger"}>HASIL: {decision.classification}</Pill>
  </Card>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.md },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.sm, marginBottom: space.md },
  sectionHeading: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  sectionTrailing: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10 },
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  pillGood: { backgroundColor: colors.greenSoft },
  pillWarning: { backgroundColor: colors.amberSoft },
  pillDanger: { backgroundColor: colors.rustSoft },
  pillNeutral: { backgroundColor: colors.pale },
  pillText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 11 },
  button: { minHeight: 44, borderRadius: radius.sm, justifyContent: "center", alignItems: "center", paddingHorizontal: space.lg },
  buttonPrimary: { backgroundColor: colors.teal },
  buttonSecondary: { borderWidth: 1, borderColor: colors.teal, backgroundColor: colors.surface },
  buttonText: { color: "white", fontFamily: fonts.bold, fontSize: 13 },
  secondaryText: { color: colors.teal },
  pressed: { opacity: 0.75 },
  telemetryCard: { flex: 1, minWidth: 96, padding: 12, marginRight: 7, marginBottom: 0 },
  cardLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  metricLine: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  metricValue: { color: colors.ink, fontFamily: fonts.mono, fontSize: 21, fontVariant: ["tabular-nums"] },
  metricUnit: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, marginLeft: 3 },
  rangeText: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 3, marginBottom: 6 },
  sparkLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 1 },
  scrubReadout: { marginBottom: 8 },
  scrubTime: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  scrubValue: { color: colors.ink, fontFamily: fonts.mono, fontSize: 11, marginTop: 4, fontVariant: ["tabular-nums"] },
  chartTouch: { width: "100%" },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 2 },
  axisText: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9 },
  legend: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  zoneLabel: { color: colors.green, fontFamily: fonts.medium, fontSize: 9, marginLeft: "auto" },
  treeCard: { alignItems: "center" },
  treeNode: { width: "100%", borderRadius: radius.sm, padding: 12, borderWidth: 1 },
  treeNodeActive: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  treeNodeIdle: { backgroundColor: colors.background, borderColor: colors.border },
  treeRoot: { borderWidth: 2 },
  treeLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11 },
  treeLabelActive: { color: colors.green },
  treeDetail: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10, marginTop: 5 },
  treeDetailActive: { color: colors.ink },
  treeStem: { width: 1, height: 14, backgroundColor: colors.border },
});
