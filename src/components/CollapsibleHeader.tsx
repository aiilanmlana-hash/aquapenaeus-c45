import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export default function CollapsibleHeader({ scrollY, pond, onTogglePond }: { scrollY: Animated.Value; pond: string; onTogglePond: () => void }) {
  const height = scrollY.interpolate({ inputRange: [0, 130], outputRange: [132, 72], extrapolate: "clamp" });
  const expandedOpacity = scrollY.interpolate({ inputRange: [0, 65, 110], outputRange: [1, 0.3, 0], extrapolate: "clamp" });
  const compactOpacity = scrollY.interpolate({ inputRange: [65, 110], outputRange: [0, 1], extrapolate: "clamp" });
  return <Animated.View style={[styles.header, { height }]}>
    <View style={styles.headerTop}>
      <Text style={styles.brand}>MANERO <Text style={styles.brandAccent}>AQUACULTURE</Text></Text>
      <Text style={styles.headerLocation}>Bangkalan · Madura</Text>
    </View>
    <Animated.View style={[styles.headerBottom, { opacity: expandedOpacity }]}>
      <View><Text style={styles.locationLabel}>LOKASI TAMBAK</Text><Text style={styles.locationTitle}>Tambak Manero</Text></View>
      <Pressable onPress={onTogglePond} style={styles.pondSelect}>
        <Text style={styles.pondLabel}>KOLAM AKTIF</Text><Text style={styles.pondValue}>{pond.replace("Manero - ", "")}  ▾</Text>
      </Pressable>
    </Animated.View>
    <Animated.View style={[styles.compactLocation, { opacity: compactOpacity }]}>
      <Text style={styles.compactText}>Tambak Manero · {pond.replace("Manero - ", "")}</Text>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 20, justifyContent: "space-between", overflow: "hidden" },
  headerTop: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: colors.ink, fontFamily: fonts.bold, letterSpacing: 0.7, fontSize: 10 },
  brandAccent: { color: colors.teal },
  headerLocation: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  headerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 13 },
  locationLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 0.8 },
  locationTitle: { color: colors.ink, fontFamily: fonts.bold, fontSize: 19, marginTop: 3 },
  pondSelect: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 10 },
  pondLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 7, letterSpacing: 0.6 },
  pondValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 10, marginTop: 3 },
  compactLocation: { position: "absolute", bottom: 8, left: 20, right: 20, alignItems: "center" },
  compactText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 12 },
});
