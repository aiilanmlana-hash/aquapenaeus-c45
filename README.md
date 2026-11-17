# Manero Aquaculture — Bangkalan, Madura

Aplikasi mobile Expo/React Native untuk pemantauan kualitas air tambak udang vaname dan demonstrasi Sistem Pendukung Keputusan C4.5.

## Menjalankan aplikasi

```bash
npm install
npx expo start
```

Jalankan di Expo Go, Android emulator, atau iOS simulator. Untuk pemeriksaan tipe:

```bash
npm run typecheck
```

## Modul

- `src/engine/c45/`: evaluator IF–THEN murni, entropy, information gain, gain ratio, Gini impurity, dan pencarian split Gini.
- `src/services/iot/`: pembacaan simulasi offline dan klien REST untuk endpoint ESP32/gateway.
- `src/storage/`: log dan alert persisten via AsyncStorage serta ekspor CSV melalui lembar berbagi perangkat.
- `src/components/`: kartu instrumen, chart scrub interaktif, reveal, dan visualisasi pohon.
- `src/screens/`: Pantau, Analisis C4.5, Riwayat Log, dan Perangkat.
- `src/theme/`: token warna dan tipografi Tactile Field UI.

## Menghubungkan ESP32

Mode simulasi aktif saat pertama dipakai dan membuat pembacaan demo setiap 10 detik. Matikan toggle simulasi pada tab Pantau, lalu masukkan endpoint HTTP REST dan ID perangkat pada tab Perangkat. Endpoint harus mengembalikan JSON dengan `temperature`, `ph`, dan `salinity` (atau alias `suhu` dan `salinitas`), misalnya:

```json
{"deviceId":"ESP32-MNR-A1","temperature":29.4,"ph":7.9,"salinity":21}
```

Untuk MQTT gunakan bridge/gateway yang menyediakan REST API. Kegagalan koneksi ditampilkan sebagai pesan pada aplikasi; tidak ada fallback simulasi diam-diam.

Ambang split pH, suhu, dan salinitas dapat dikonfigurasi pada tab Perangkat; perubahan disimpan lokal dan digunakan oleh evaluator live serta simulator.

## Catatan model

Ambang split pH 7.495, suhu 28.755°C, dan salinitas 25.635 ppt disediakan sebagai acuan konfigurasi. Label BAGUS memerlukan pH dan suhu pada batas cabang yang sesuai dan dalam rentang ideal, serta salinitas 15–25 ppt. Dataset sepuluh baris yang dipakai untuk tabel entropy/information gain adalah dataset demonstrasi, bukan data mentah penelitian Iqbal et al. (2020). Gunakan dataset penelitian/hasil kalibrasi lapangan untuk validasi operasional; rekomendasi bukan pengganti SOP teknis tambak.

Riwayat disimpan lokal hingga 1.500 pembacaan dan 250 alert. Ekspor saat ini tersedia dalam CSV; PDF belum disediakan.
