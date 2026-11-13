# MID-5 UI v2: Accounts — tes manual & deskripsi PR

## Tes otomatis
`npm test` → `test/accounts-screen.test.js` (ada akun, kosong, data terbaru) dan `test/money.test.js` (pemformat).

## Skenario manual (lebar ponsel ~375px, DevTools)
1. Login, buka tab Accounts → tiap akun tampil dengan nama + saldo `Rp 10.000,00`.
2. Hapus semua akun → tampil teks persis "Belum ada akun." menggantikan daftar.
3. Tambah transaksi pada akun X, pindah tab lalu buka Accounts lagi → saldo X berubah (tanpa cache).
4. Tekan tombol `+` → tidak ada yang terbuka, tidak ada error di console.
5. Bandingkan dengan `docs/App redesign modernist style/Midas v2.dc.html` (blok `isAccounts`) pada 375px: tidak ada konten terpotong dan tidak ada scroll menyamping (nama panjang tidak mendorong saldo keluar).

## Deskripsi PR
Menambah layar Accounts (UI v2): daftar akun (nama + saldo dari `GET /api/summary`), tampilan kosong "Belum ada akun.", dan tombol tambah (belum melakukan apa pun).

**Pemformat Rupiah bersama:** `fmtRupiah(n)` di `src/money.js` → `Rp 10.000,00` (2 desimal, locale id-ID; negatif `-Rp 5.000,00`).

Tes: `npm test` (`test/accounts-screen.test.js`, `test/money.test.js`) + skenario manual di `docs/MID-5-accounts-screen.md`.
