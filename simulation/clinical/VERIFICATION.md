# Slutkontroller – klinisk kompletteringssimulering

- `node --test tests/*.test.cjs`: **399 tester passerar**, inklusive sju
  kliniska tester och tidigare datumreferenser 302–304.
- `npx --no-install tsc --noEmit --incremental false`: passerar.
- `npm run lint`: passerar utan varningar eller fel.
- Riktad ESLint av `clinical-simulate.ts`, `clinical-run.cjs` och
  `clinicalSimulation.test.cjs`: passerar.
- `git diff --check`: passerar; inga tidigare spårade filer är ändrade.

Kontrollerna omfattar full paritet mot huvudgeneratorns 1 000 fall med dess
inställningar, oförändrade b-drag vid ändrad förskjutning, 250 unika ID,
nya filbytes och åtskilda starttillstånd, faktisk inläsning av alla nya
filer, Windows-1252/CRLF-format, giltiga registreringsfält, åldersregler,
2–5 uppgifter per område och 10–25 totalt, lokal beräkning, fullständig
informationstabell och separata gruppfördelningar.

Upprepad generering och leverans ger identiska filer. Kontrollsummorna för
alla **1 231 tidigare simuleringsfiler** är oförändrade, inklusive de 200
pilotfallen, de 1 000 huvudfallen, rapporterna, jämförelseverktyget och de
åtta manuella huvudexporterna. Dessa exporter har endast kontrollsummerats
för bevarande; deras resultat har inte jämförts.

`exports/` är tom vid leveransen. Inga kliniska programdataexporter eller
nya programjämförelser har skapats. Befintliga pilotjämförelser körs som
regressionstester; ingen jämförelse av huvud- eller kliniskt material ingår.

Samtliga nya Rasch-estimat, modellpercentiler och extremflaggor är
preliminära simuleringsresultat. Två fall får preliminärt modellpercentil 0,
nio är minestimerade och inget är maxestimerat. Ingen anpassning har gjorts
för att framtvinga dessa utfall. De beskrivande gränserna för låga absoluta
Rasch-estimat i rapporten är inte diagnostiska kriterier.

Inga problem som hindrar den senare jämförelsen har identifierats i
genereringskontrollerna. Faktisk öppning och export av det kliniska
materialet i båda programmen återstår. Filernas format och ID-grupper ska
verifieras när samtliga tio manuella exporter jämförs efter användarens
godkännande. Den planerade A/B/C-redovisningen finns i README.md.

Inga paket installerades eller uppgraderades. Tidigare material,
produktionskod och jämförelseregler har bevarats. Ingen commit eller push
har gjorts.
