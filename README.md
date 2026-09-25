# Mic Bluetooth PWA

PWA eksperimen untuk menguji **microphone HP → Bluetooth → speaker**, khususnya Soundcore Boom 2 SE.

## Versi 1
- Microphone real-time dengan Web Audio API.
- Mode latency hint: interactive.
- Echo cancellation, noise suppression, dan auto gain melalui constraint microphone browser.
- Gain + compressor sederhana.
- Level meter.
- Tidak merekam atau mengunggah suara.
- Bisa dipasang sebagai PWA.

## Cara menjalankan
PWA harus dibuka melalui **HTTPS** agar akses microphone tersedia.

Untuk GitHub Pages:
1. Buka **Settings → Pages** pada repository.
2. Pada **Build and deployment**, pilih **Deploy from a branch**.
3. Pilih branch **main** dan folder **/ (root)**.
4. Simpan.
5. Setelah Pages aktif, buka:
   `https://msukri89.github.io/mic-bluetooth-pwa/`

## Cara uji dengan Soundcore Boom 2 SE
1. Sambungkan HP ke Boom 2 SE melalui Bluetooth.
2. Buka PWA melalui Chrome/HTTPS.
3. Tekan **MULAI MIC** dan izinkan microphone.
4. Mulai dari volume speaker rendah.
5. Bicara dari jarak sekitar 10–20 cm dari HP.
6. Catat delay dan feedback.
7. Jika feedback muncul, turunkan volume speaker dan jauhkan HP dari speaker.

> Catatan: kemampuan routing audio Bluetooth dan latency bergantung pada Android, browser, dan perangkat Bluetooth. Echo cancellation browser tidak menjamin feedback hilang sepenuhnya.

## Status
**Versi uji coba 1 — fokus pengujian dasar dan latency.**
