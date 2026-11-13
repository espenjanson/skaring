# Slutkontroller för huvudsimuleringen

- `node --test tests/*.test.cjs`: **392 tester passerar**, inklusive sju nya
  huvudsimuleringstester och befintliga datumreferenser 302–304.
- `npx --no-install tsc --noEmit --incremental false`: passerar.
- `npm run lint`: passerar utan varningar eller fel.
- Riktad ESLint av `main-simulate.ts`, `main-run.cjs` och
  `mainSimulation.test.cjs`: passerar.
- `git diff --check`: passerar. Inga tidigare spårade filer är ändrade.

De sju nya testerna kontrollerar paritet mot den oförändrade pilotgeneratorn,
nya unika ID och filbytes, exakt fyra mappar med 250 registreringar,
ordinarie parser/serializer och beräkning för samtliga 1 000 fall,
ålders-/köns-/uppgiftsregler, statistik och informationstabell,
bevarade pilotartefakter och identisk upprepad leverans samt ogiltiga
generatorinställningar.

Upprepade körningar har jämförts inklusive registreringar, rapporter,
informationstabell och kontrollsummor. De godkända pilotfilerna, deras
manuella exporter/rapporter och jämförelseverktyget är oförändrade enligt
`pilot-preservation.json`. Inga paket installerades eller uppgraderades.

Mottagningsmappen `exports/` är tom vid leveransen. Ingen jämförelsemapp
eller några huvudexporter har skapats. Den kliniska kompletteringen har
endast dokumenterats som plan. Ingen commit eller push har gjorts.

Inga avvikelser från uppdragets genereringsregler har upptäckts. Materialets
fördelning är inte en exakt normfördelning: bland annat saknas percentil 0.
Detta är en observerad egenskap hos det fasta slumpurvalet och har inte
åtgärdats genom ändrad spridning, annat frö eller utbyte av barn.

Manuell öppning/export i Windows- och webbprogrammen samt programjämförelsen
återstår. Nästa steg är de åtta manuella exporter som anges i README.md.
