import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans";
import { evaluateWater, SplitPoints, splitPoints } from "./src/engine/c45";
import { simulatedReading, fetchEsp32Reading, SensorReading } from "./src/services/iot";
import { addAlert, addReading, getAlerts, getDeviceConfig, getReadings, getThresholds, saveThresholds, StoredAlert, StoredReading, saveDeviceConfig } from "./src/storage";
import { exportReadingsCsv } from "./src/storage/export";
import { colors, fonts } from "./src/theme";
import PantauScreen from "./src/screens/PantauScreen";
import AnalysisScreen from "./src/screens/AnalysisScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import DeviceScreen from "./src/screens/DeviceScreen";
import CollapsibleHeader from "./src/components/CollapsibleHeader";

type Tab = "Pantau" | "Analisis C4.5" | "Riwayat Log" | "Perangkat";
const tabs: { label: Tab; icon: string }[] = [
  { label: "Pantau", icon: "◉" },
  { label: "Analisis C4.5", icon: "⑂" },
  { label: "Riwayat Log", icon: "▤" },
  { label: "Perangkat", icon: "⚙" },
];

export default function App() {
  const [loaded] = useFonts({
    [fonts.body]: PlusJakartaSans_400Regular,
    [fonts.medium]: PlusJakartaSans_600SemiBold,
    [fonts.bold]: PlusJakartaSans_700Bold,
    [fonts.mono]: JetBrainsMono_500Medium,
  });
  const [tab, setTab] = useState<Tab>("Pantau");
  const [pond, setPond] = useState("Manero - Kolam A1");
  const [simulated, setSimulated] = useState(true);
  const [reading, setReading] = useState<SensorReading>(() => simulatedReading(undefined, "Manero - Kolam A1"));
  const [logs, setLogs] = useState<StoredReading[]>([]);
  const [alerts, setAlerts] = useState<StoredAlert[]>([]);
  const [deviceId, setDeviceId] = useState("ESP32-MNR-A1");
  const [endpoint, setEndpoint] = useState("");
  const [sensorOnline, setSensorOnline] = useState(false);
  const [thresholds, setThresholds] = useState<SplitPoints>(splitPoints);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [errorMessage, setErrorMessage] = useState("");
  const [ready, setReady] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const priorClass = useRef<string | null>(null);
  const readingRef = useRef(reading);
  const scrollRef = useRef<ScrollView>(null);

  const decision = useMemo(() => evaluateWater(reading, thresholds), [reading, thresholds]);

  useEffect(() => {
    let active = true;
    Promise.all([getReadings(), getAlerts(), getDeviceConfig(), getThresholds()]).then(([storedLogs, storedAlerts, config, storedThresholds]) => {
      if (!active) return;
      setLogs(storedLogs);
      setAlerts(storedAlerts);
      setDeviceId(config.deviceId);
      setEndpoint(config.endpoint);
      setThresholds(storedThresholds);
      if (storedLogs.length) {
        const latest = storedLogs[0];
        const restored = { ...latest, source: latest.source };
        readingRef.current = restored;
        setReading(restored);
        setLastUpdated(latest.timestamp);
        priorClass.current = latest.classification;
      }
      setReady(true);
    }).catch((error: unknown) => {
      if (active) {
        setErrorMessage(`Gagal memuat penyimpanan lokal: ${messageOf(error)}`);
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const update = async () => {
      let next: SensorReading;
      try {
        next = simulated
          ? simulatedReading(readingRef.current, pond)
          : await fetchEsp32Reading({ endpoint, deviceId, intervalSeconds: 10 }, pond);
      } catch (error) {
        if (active) {
          setSensorOnline(false);
          setErrorMessage(`Koneksi sensor gagal: ${messageOf(error)}`);
        }
        return;
      }
      if (!active) return;
      if (!simulated) setSensorOnline(true);
      const nextDecision = evaluateWater(next, thresholds);
      const saved: StoredReading = { ...next, classification: nextDecision.classification };
      readingRef.current = next;
      setReading(next);
      setLastUpdated(next.timestamp);
      setErrorMessage("");
      setLogs((current) => [saved, ...current].slice(0, 1500));
      try {
        await addReading(saved);
      } catch (error) {
        if (active) setErrorMessage(`Gagal menyimpan pembacaan lokal: ${messageOf(error)}`);
      }
      if (nextDecision.classification === "TIDAK BAGUS" && priorClass.current !== "TIDAK BAGUS") {
        const alert: StoredAlert = {
          id: `${Date.now()}-${next.id}`,
          timestamp: next.timestamp,
          message: `Kondisi ${pond} TIDAK BAGUS. ${nextDecision.recommendation}`,
          severity: "danger",
        };
        try {
          await addAlert(alert);
          if (active) setAlerts((current) => [alert, ...current].slice(0, 250));
        } catch (error) {
          if (active) setErrorMessage(`Gagal menyimpan alert: ${messageOf(error)}`);
        }
      }
      priorClass.current = nextDecision.classification;
    };
    const timer = setInterval(() => { void update(); }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [deviceId, endpoint, pond, ready, simulated, thresholds]);

  async function saveDevice(nextId: string, nextEndpoint: string) {
    if (!nextId) throw new Error("ID perangkat wajib diisi.");
    await saveDeviceConfig({ deviceId: nextId, endpoint: nextEndpoint });
    setDeviceId(nextId);
    setEndpoint(nextEndpoint);
    setSensorOnline(false);
  }

  async function saveDecisionThresholds(next: SplitPoints) {
    await saveThresholds(next);
    setThresholds(next);
  }

  function toggleSimulation() {
    setSensorOnline(false);
    setSimulated((value) => !value);
  }

  async function handleExport() {
    try {
      await exportReadingsCsv(logs);
    } catch (error) {
      Alert.alert("Ekspor gagal", messageOf(error));
    }
  }

  function renderScreen() {
    switch (tab) {
      case "Pantau":
        return <PantauScreen reading={reading} decision={decision} simulated={simulated} online={sensorOnline} onToggleSimulation={toggleSimulation} lastUpdated={lastUpdated} />;
      case "Analisis C4.5":
        return <AnalysisScreen values={reading} thresholds={thresholds} />;
      case "Riwayat Log":
        return <HistoryScreen readings={logs} onExport={() => { void handleExport(); }} />;
      case "Perangkat":
        return <DeviceScreen deviceId={deviceId} endpoint={endpoint} onSave={saveDevice} alerts={alerts} onError={setErrorMessage} thresholds={thresholds} onSaveThresholds={saveDecisionThresholds} />;
    }
  }

  if (!loaded) return <SafeAreaView style={styles.loading}><Text style={styles.brand}>MANERO AQUACULTURE</Text><Text style={styles.loadingText}>Menyiapkan instrumen tambak…</Text></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <CollapsibleHeader scrollY={scrollY} pond={pond} onTogglePond={() => setPond((current) => current.endsWith("A1") ? "Manero - Kolam A2" : "Manero - Kolam A1")} />
    <Animated.ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })} scrollEventThrottle={16} bounces={false} showsVerticalScrollIndicator={false}>
      <View style={styles.pageTitleRow}><View><Text style={styles.pageTitle}>{tab}</Text><Text style={styles.pageSubtitle}>{tab === "Pantau" ? "Kualitas air tambak · siklus berjalan" : "Manero Aquaculture · Monitoring & SPK"}</Text></View><Text style={styles.clock}>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</Text></View>
      {errorMessage ? <Pressable onPress={() => setErrorMessage("")} style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}  ×</Text></Pressable> : null}
      {renderScreen()}
      <View style={styles.bottomSpace} />
    </Animated.ScrollView>
    <View style={styles.tabBar}>{tabs.map((item) => {
      const active = tab === item.label;
      return <Pressable key={item.label} onPress={() => { setTab(item.label); scrollY.setValue(0); scrollRef.current?.scrollTo({ y: 0, animated: false }); }} style={styles.tabItem}>
        <Text style={[styles.tabIcon, active && styles.activeTabText]}>{item.icon}</Text><Text numberOfLines={1} style={[styles.tabLabel, active && styles.activeTabText]}>{item.label}</Text>
        {active ? <View style={styles.activeMark} /> : null}
      </Pressable>;
    })}</View>
  </SafeAreaView>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  loadingText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  pageTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13 },
  pageTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 20 },
  pageSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 2 },
  clock: { color: colors.muted, fontFamily: fonts.mono, fontSize: 10, fontVariant: ["tabular-nums"] },
  errorBanner: { backgroundColor: colors.rustSoft, borderColor: "#E8B9B7", borderWidth: 1, borderRadius: 9, padding: 10, marginBottom: 12 },
  errorText: { color: colors.rust, fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  bottomSpace: { height: 14 },
  tabBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, minHeight: 59, flexDirection: "row", paddingHorizontal: 4, paddingTop: 5, paddingBottom: 3 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  tabIcon: { color: colors.muted, fontSize: 16, height: 19 },
  tabLabel: { color: colors.muted, fontFamily: fonts.medium, fontSize: 8 },
  activeTabText: { color: colors.teal },
  activeMark: { position: "absolute", top: -5, width: 28, height: 2, borderRadius: 2, backgroundColor: colors.teal },
});
