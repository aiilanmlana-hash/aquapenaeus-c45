import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StoredReading } from "../storage";
import { colors, fonts, radius } from "../theme";
import { ActionButton, Card, Pill, SectionTitle } from "../components/FieldUI";
import { HistoryProps } from "./types";

type StatusFilter = "ALL" | "BAGUS" | "TIDAK BAGUS";
export default function HistoryScreen({ readings, onExport }: HistoryProps) {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY">("ALL");
  const filtered = useMemo(() => readings.filter((item) => {
    const matchesStatus = status === "ALL" || item.classification === status;
    const matchesDate = dateFilter === "ALL" || new Date(item.timestamp).toDateString() === new Date().toDateString();
    return matchesStatus && matchesDate;
  }), [dateFilter, readings, status]);
  return <>
    <Card style={styles.summary}>
      <View><Text style={styles.summaryLabel}>TOTAL PEMBACAAN TERSIMPAN</Text><Text style={styles.summaryCount}>{readings.length.toLocaleString("id-ID")}</Text></View>
      <View style={styles.export}><ActionButton label="Ekspor CSV" onPress={onExport} /></View>
    </Card>
    <SectionTitle title="Filter log" />
    <View style={styles.filters}>
      <View style={styles.filterGroup}>{(["ALL", "TODAY"] as const).map((value) => <Filter key={value} label={value === "ALL" ? "Semua tanggal" : "Hari ini"} active={dateFilter === value} onPress={() => setDateFilter(value)} />)}</View>
      <View style={styles.filterGroup}>{(["ALL", "BAGUS", "TIDAK BAGUS"] as const).map((value) => <Filter key={value} label={value === "ALL" ? "Semua status" : value} active={status === value} onPress={() => setStatus(value)} />)}</View>
    </View>
    <SectionTitle title="Pembacaan sensor" trailing={`${filtered.length} BARIS`} />
    <Card style={styles.logCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.tableHead}>
            <Text style={[styles.col, styles.dateCol]}>WAKTU</Text><Text style={styles.col}>SUHU</Text><Text style={styles.col}>pH</Text><Text style={styles.col}>SALINITAS</Text><Text style={[styles.col, styles.statusCol]}>HASIL C4.5</Text>
          </View>
          {filtered.slice(0, 100).map((item) => <LogRow key={item.timestamp + item.id} item={item} />)}
          {!filtered.length && <Text style={styles.empty}>Belum ada log sesuai filter. Pembacaan baru akan disimpan otomatis.</Text>}
        </View>
      </ScrollView>
    </Card>
    <Text style={styles.footnote}>Riwayat tersimpan lokal di perangkat (maks. 1.500 pembacaan). Untuk laporan lengkap, gunakan tombol Ekspor CSV.</Text>
  </>;
}

function LogRow({ item }: { item: StoredReading }) {
  return <View style={styles.tableRow}>
    <Text style={[styles.cell, styles.dateCol]}>{new Date(item.timestamp).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
    <Text style={styles.cell}>{item.temperature.toFixed(1)}°</Text><Text style={styles.cell}>{item.ph.toFixed(2)}</Text><Text style={styles.cell}>{item.salinity.toFixed(1)}</Text>
    <View style={[styles.cell, styles.statusCol]}><Pill tone={item.classification === "BAGUS" ? "good" : "danger"}>{item.classification}</Pill></View>
  </View>;
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Text onPress={onPress} style={[styles.filter, active && styles.filterActive]}>{label}</Text>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 9 },
  summaryCount: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 26, marginTop: 4, fontVariant: ["tabular-nums"] },
  export: { width: 110 },
  filters: { gap: 8, marginBottom: 8 },
  filterGroup: { flexDirection: "row", gap: 6 },
  filter: { color: colors.textSecondary, borderWidth: 1, borderColor: colors.border, overflow: "hidden", borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 10, fontFamily: fonts.medium, fontSize: 10 },
  filterActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary, color: "white" },
  logCard: { padding: 10, minHeight: 130 },
  tableHead: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  col: { width: 76, color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 8, textAlign: "right", paddingHorizontal: 5 },
  dateCol: { width: 108, textAlign: "left" },
  statusCol: { width: 125 },
  tableRow: { flexDirection: "row", alignItems: "center", minHeight: 45, borderBottomWidth: 1, borderColor: colors.border },
  cell: { width: 76, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 10, textAlign: "right", paddingHorizontal: 5 },
  empty: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 11, paddingVertical: 18, maxWidth: 270 },
  footnote: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 5, marginBottom: 20 },
});
