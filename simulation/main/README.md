# Huvudsimulering – körning och nästa steg

Kör från projektroten för att återskapa och kontrollera de 1 000 filerna:

```powershell
node simulation/main-run.cjs
node --test tests/mainSimulation.test.cjs
```

Frö 20261114, S0201–S1200, sigma_b 0,85, c −0,02 och k 0,005. t = a + b utan förskjutning. Algoritmen och dragordningen är desamma som i piloten. Endast antal, frö och ID-serie skiljer. Pilotgeneratorn och jämförelseverktyget läses utan att ändras. Alla beräkningar sker lokalt; inga paket installeras och inga nätverksanrop görs.

Befintliga identiska filer accepteras. Befintliga avvikande filer skrivs aldrig över. Hela pilotmaterialet och dess exporter/rapporter verifieras mot pilot-preservation.json före och efter körning. Se report.md för statistik och summary.json för exakta tal. generation.tsv är simuleringsinformation, inte en Windows- eller webbexport.

## Åtta manuella exporter

För varje rad: exportera endast den angivna mappens 250 registreringar, först med Windows-programmet och sedan med webbprogrammet. Spara i exports/ med nedanstående namn. Byt inte namn på registreringarna och placera inte exporterna i registreringsmapparna.

| Registreringsmapp | Windows-export | Webbexport |
|---|---|---|
| 01_S0201-S0450 | 01_S0201-S0450_windows.dat | 01_S0201-S0450_webb.txt |
| 02_S0451-S0700 | 02_S0451-S0700_windows.dat | 02_S0451-S0700_webb.txt |
| 03_S0701-S0950 | 03_S0701-S0950_windows.dat | 03_S0701-S0950_webb.txt |
| 04_S0951-S1200 | 04_S0951-S1200_windows.dat | 04_S0951-S1200_webb.txt |

exports/ skapas som tom mottagningsmapp. Inga exportfiler eller jämförelser skapas av generatorn. De planerade namnen är en namnkonvention för manuellt skapade filer.

## Jämförelse först efter manuell export

När samtliga åtta filer faktiskt finns kan följande fyra kommandon användas:

```powershell
node simulation/compare.cjs "simulation/main/exports/01_S0201-S0450_windows.dat" "simulation/main/exports/01_S0201-S0450_webb.txt" --out "simulation/main/comparisons/01_S0201-S0450"
node simulation/compare.cjs "simulation/main/exports/02_S0451-S0700_windows.dat" "simulation/main/exports/02_S0451-S0700_webb.txt" --out "simulation/main/comparisons/02_S0451-S0700"
node simulation/compare.cjs "simulation/main/exports/03_S0701-S0950_windows.dat" "simulation/main/exports/03_S0701-S0950_webb.txt" --out "simulation/main/comparisons/03_S0701-S0950"
node simulation/compare.cjs "simulation/main/exports/04_S0951-S1200_windows.dat" "simulation/main/exports/04_S0951-S1200_webb.txt" --out "simulation/main/comparisons/04_S0951-S1200"
```

Kommandona ovan är instruktioner och har inte körts för huvudmaterialet. De använder det godkända jämförelseverktyget och dess oförändrade regler. Se ../COMPARISON.md för kodning, 14/18-kolumnsmappning, toleranser och exitkoder. Verktyget accepterar 250 fall per par utan ändring.

## Kontroller

```powershell
node --test tests/*.test.cjs
npx --no-install tsc --noEmit --incremental false
npm run lint
npx --no-install eslint simulation/main-simulate.ts simulation/main-run.cjs tests/mainSimulation.test.cjs
```

Separat klinisk komplettering med 250 fall är endast planerad i report.md. Den är inte genererad och kräver beslut om exakta gränser före körning. Ingen commit eller push ingår.
