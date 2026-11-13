# Slutkontroller – jämförelse av 1 250 registreringar

- `node --test tests/*.test.cjs`: **403 tester passerar**, inklusive fyra
  nya tester av den gemensamma sammanställningen.
- `npx --no-install tsc --noEmit --incremental false`: passerar.
- `npm run lint`: passerar utan varningar eller fel.
- Riktad ESLint av `verify-all.ts`, `verify-all.cjs` och
  `combinedVerification.test.cjs`: passerar.
- `git diff --check`: passerar. Inga tidigare spårade filer är ändrade.

Testerna verifierar exakt rätt 250 ID per faktiskt exportpar, en disjunkt
union av S0201–S1450, separat A/B/C-räkning, 13 direkta kolumner och separat
anmärkningskontroll, korrekt hantering av fem ej individuellt jämförbara
kolumner, faktiska exporterade percentiler och extremflaggor samt att
överlappande ID avvisas vid sammanslagning.

Rapporterna och statistiken är reproducerbara vid upprepad körning.
Kontrollsummor verifierar att samtliga tidigare simuleringsfiler och de tio
manuella exporterna är oförändrade. Se preserved-files.json för hela listan.
Det godkända jämförelseverktyget och dess regler har inte ändrats.

Observerat resultat: 16 250 exakt lika direkta fältkontroller och 1 250
exakt lika sammansättningskontroller av anmärkningar. Inga avvikelser finns
i avkodade jämförbara värden, varken formatmässigt, inom tolerans eller
utanför tolerans. Fem webbkolumner saknar individuell Windows-motsvarighet
och ingår inte i påståendet om överensstämmelse.

Gruppstatistiken bygger på de verkliga exporterna. Rekonstruerade
åldersrelaterade differenser är separat märkta som härledda beskrivande
värden och ska inte förväxlas med oavrundade interna beräkningsresultat.

Inga nya registreringar eller påstådda programdataexporter har skapats.
Ingen produktionskod, tidigare rapport eller jämförelseregel har ändrats.
Inga paket har installerats eller uppgraderats. Ingen commit eller push
har gjorts.
