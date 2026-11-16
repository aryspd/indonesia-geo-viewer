# Setup Windows (PowerShell)

## Persyaratan
- Node.js 22.12 atau lebih baru (Vite 8 memerlukan Node `^20.19.0 || >=22.12.0`).
- npm 10 atau lebih baru.

## Jika sebelumnya `npm install` gagal dengan ERESOLVE
Buka terminal PowerShell pada folder yang berisi `package.json`, lalu jalankan:

```powershell
node -v
npm -v
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache verify
npm install
```

Jangan gunakan `--force` atau `--legacy-peer-deps`. Vite 8 memakai rentang peer opsional esbuild `^0.27.0 || ^0.28.0`; paket ini sudah diselaraskan ke `esbuild ^0.28.2`.

## Jalankan mode development

```powershell
npm run dev
```

Buka URL lokal yang dicetak di terminal. `tsx` sudah tercantum di `devDependencies`; pesan `tsx is not recognized` sebelumnya muncul karena instalasi dependency gagal sehingga executable belum dibuat di `node_modules/.bin`.

## Jalankan production server lokal

```powershell
npm run build
npm run start
```

Script `start` memakai `cross-env` supaya pengaturan `NODE_ENV=production` kompatibel di Windows PowerShell/CMD maupun Linux/macOS.

## Pemeriksaan

```powershell
npm run lint
npm test
npm run build
```

Jika `node -v` masih lebih rendah dari v22.12.0, upgrade Node.js terlebih dahulu, tutup terminal VS Code/PowerShell, buka kembali, lalu cek `node -v`.
