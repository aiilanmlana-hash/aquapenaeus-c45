import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export default function CollapsibleHeader({ scrollY, pond, onTogglePond }: { scrollY: Animated.Value; pond: string; onTogglePond: () => void }) {
  const height = scrollY.interpolate({ inputRange: [0, 130], outputRange: [132, 72], extrapolate: "clamp" });
  const expandedOpacity = scrollY.interpolate({ inputRange: [0, 65, 110], outputRange: [1, 0.3, 0], extrapolate: "clamp" });
  const compactOpacity = scrollY.interpolate({ inputRange: [65, 110], outputRange: [0, 1], extrapolate: "clamp" });
  return <Animated.View style={[styles.header, { height }]}>
    <View style={styles.headerTop}>
      <View>
        <Text style={styles.brand}>Aquapenaeus C4.5</Text>
        <Text style={styles.brandSubtitle}>SPK KUALITAS AIR • C4.5</Text>
      </View>
      <Text style={styles.headerLocation}>Maneron · Kec. Sepulu</Text>
    </View>
    <Animated.View style={[styles.headerBottom, { opacity: expandedOpacity }]}>
      <View><Text style={styles.locationLabel}>LOKASI TAMBAK</Text><Text style={styles.locationTitle}>Tambak Maneron</Text><Text style={styles.locationDetail}>Kab. Bangkalan · Madura</Text></View>
      <Pressable onPress={onTogglePond} style={styles.pondSelect}>
        <Text style={styles.pondLabel}>KOLAM AKTIF</Text><Text style={styles.pondValue}>{pond.replace("Tambak Maneron - ", "")}  ▾</Text>
      </Pressable>
    </Animated.View>
    <Animated.View style={[styles.compactLocation, { opacity: compactOpacity }]}>
      <Text style={styles.compactText}>Tambak Maneron · {pond.replace("Tambak Maneron - ", "")}</Text>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 20, justifyContent: "space-between", overflow: "hidden" },
  headerTop: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: colors.textPrimary, fontFamily: fonts.bold, letterSpacing: 0.4, fontSize: 10 },
  brandSubtitle: { color: colors.brandPrimary, fontFamily: fonts.bold, letterSpacing: 0.35, fontSize: 7, marginTop: 2 },
  headerLocation: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 9, paddingRight: 52 },
  headerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 13 },
  locationLabel: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.8 },
  locationTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 19, marginTop: 3 },
  locationDetail: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 9, marginTop: 2 },
  pondSelect: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 10 },
  pondLabel: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 7, letterSpacing: 0.6 },
  pondValue: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 10, marginTop: 3 },
  compactLocation: { position: "absolute", bottom: 8, left: 20, right: 20, alignItems: "center" },
  compactText: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 12 },
});
