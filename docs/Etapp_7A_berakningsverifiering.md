# Etapp 7A – beräkningsverifiering

Datum: 2026-11-03. Utgångspunkt: `f52d403646750a384f4e2e45705e3ee183249ce4`.
Ingen commit eller push ingår. React-resultatbilden är oförändrad.

## Referenstabell och precision

Den strukturerade referenstabellen finns i
[`tests/fixtures/calculationReferences.json`](../tests/fixtures/calculationReferences.json).
Den innehåller elva registreringar, elva exportrader och arton rapportvarianter.
Registreringsdata har separata textfält, datum, visad ålder och ursprungliga
50 uppgiftstecken. Varje beräkningsvariant anger områdesurval, antal giltiga
uppgifter, poängsumma, beräkningsvärden och presentationsvärden. Källfil,
exportrad respektive PDF-sida anges. SHA-256 binder tabellen till originalen.
Originalreferenserna ändras inte. Endast fiktiva lokala referensfall används.

- Exportens Rasch, standardfel och LOGALDER har tre decimaler. Exakta
  exporterade decimaler bevaras, men underliggande oavrundade värden saknas.
  Rasch och standardfel jämförs med absolut tolerans 0,0005.
- PDF:ernas Rasch och standardfel har två decimaler: tolerans 0,005.
- Flaggor, antal, poängsummor, kategorier och Å:M-texter jämförs exakt.
- `missing` betyder att uppgiften inte redovisas i källan.
  `not-computable` betyder att beräkningen/presentationen uttryckligen saknas
  av funktionella skäl. Numeriska nullvärden används aldrig som noll.
- Alla-0/alla-2 har numeriska standardfel i exporten, men rapporten visar
  att standardfel och konfidensintervall inte kan beräknas. Båda uppgifterna
  bevaras; exportvärdet testas, medan intervallet inte presenteras.
- Åldersekvivalent och intervallgränser är presentationsvärden. Texterna
  `Lavere enn 3:6` och `Høyere enn 18:0` ersätts inte med numeriska gränser.
- PDF-tabellens tio kategorier kodas 1–4: ≤15, >15–50, >50–85, >85.
- Test205A.pdf visar uppgifter från A–E och resultat som överensstämmer med
  exportens alla-områden-fall. Filnamnets A tolkas därför inte som områdesval A.

### Windows-export: alla områden

| Fall | Giltiga | Poängsumma | Rasch | Standardfel | Min/max | Åldersekvivalent |
|---|---:|---:|---:|---:|---|---|
| 201 | 12 | 12 | 0.199 | 0.417 | 0/0 | 7:6 |
| 202 | 21 | 20 | 0.394 | 0.329 | 0/0 | 7:10 |
| 205 | 11 | 19 | 3.511 | 0.602 | 0/0 | 17:5 |
| 206 | 9 | 0 | -5.899 | 1.831 | 1/0 | Lavere enn 3:6 |
| 207 | 10 | 20 | 5.773 | 1.829 | 0/1 | Høyere enn 18:0 |
| 208 | 7 | 6 | -1.757 | 0.557 | 0/0 | 4:6 |
| 209 | 3 | 3 | -1.511 | 0.774 | 0/0 | 4:10 |
| 301 | 12 | 10 | -0.149 | 0.419 | 0/0 | 6:10 |
| 302 | 7 | 6 | -2.551 | 0.519 | 0/0 | 3:8 |
| 303 | 7 | 6 | -2.551 | 0.519 | 0/0 | 3:8 |
| 304 | 7 | 6 | -2.551 | 0.519 | 0/0 | 3:8 |

Källa för exporttabellen:
[`261103 Dataexport referensfall.txt`](reference-tests/rapporter/261103%20Dataexport%20referensfall.txt),
rader 2–12. Registrerings- och PDF-källor framgår per rad i JSON-tabellen.
Modellpercentiler och LOGALDER sparas som referensdata men verifieras inte
mot en integrerad ålderskoppling i 7A.

## Rättningar och modulansvar

**Bevaras:** Formler, 50 uppgiftskalibreringar, kategoritrösklar,
konvergensvillkor, iterationsgräns och extrempoängens korrigering med 0,3.
OpenScript har konsulterats för variansnollställning och extremflaggor
(rader 1363–1375 och 1413–1416 i den äldre källfilen).

**Förbättras:** Variansen nollställs per iteration. Extremflaggor börjar på
false och aktiveras endast för respektive extremfall. Resultat och flaggor
rensas vid varje försök och vid fel, inklusive utebliven konvergens.

`calculateRegistration(registration, selectedAreas)` tar registreringens
verkliga uppgiftstecken och bygger ett separat tillfälligt poängunderlag.
Endast 0, 1, 2 deltar. Övriga tecken och uppgifter utanför urvalet blir 9 i
beräkningsunderlaget; registreringen ändras inte. Metoden kräver minst ett
område. Kärnan `raschMeasureFromItems` kräver 50 positioner och minst tre
giltiga uppgifter. Kontrollen görs vid varje anrop och kan inte kringgås av
ett tidigare godkänt urval. Nollbaserad områdesindexering ersätter de gamla
substring-anropen. Dubbletter och områdenas ordning ändrar inte underlaget.

`gIsValidAE[0..4]` anger om respektive område ensamt har minst tre poäng.
Detta är information, inte ett villkor för att välja området i en kombination.
Ett tomt valt område är tillåtet när det sammanlagt finns minst tre poäng.

`prepareInputForOutput` tar nu registrering och områdeslista i stället för
ett oanvänt textargument. Det delegerar till samma beräkningsmetod och
behåller den äldre alert-baserade felhanteringen. Ingen aktiv React-anropare
fanns eller har tillkommit. Den fristående ingången returnerar status utan
alert och används av testerna.

Statuskoder: -10000 lyckat, -10001 inga giltiga poäng, -10002 ingen
konvergens, -10003 felaktig indatalängd, -10004 endast en eller två giltiga
poäng, -10005 tomt eller ogiltigt områdesurval. Vid fel är estimat och
standardfel -9999 och båda extremflaggorna false. Antalet giltiga uppgifter
bevaras när underlaget hunnit räknas.

## Åldersbeslut inför 7B

**Bevaras:** Vid giltigt datumpar används exakt datumålder, inte det
trunkerade Å:M-värdet. Den befintliga datumfunktionen använder dagar/365,25.
När giltigt datumpar saknas men manuell ålder finns används
år + månader/12 + 1/24. När ålder saknas kan modellpercentil inte beräknas.
Åldern påverkar inte själva Rasch-skattningen eller de faktiska kategorierna.

**Verifieras i 7B:** Kopplingen mellan registrering, datumålder/manuell ålder
och gAlder, samt modellpercentilerna för framför allt 302–304. De förväntade
värdena är 35, 31 respektive 34. LOGALDER är 1,397 i alla tre exportrader;
det är därför inte ett oberoende facit för deras olika exakta datumåldrar.
Den äldre OpenScript-exporten logaritmerar visad ålder med halvmånadstillägg
(rader 931–940), vilket förklarar varför exportkolumnen behöver hållas isär
från den ålder som används i rapportens percentilberäkning.
Eventuella avvikelser mot Windows ska redovisas öppet; inga åldersformler
eller ålderskopplingar ändras i denna etapp.

## Testning och avgränsningar

Tester finns i `tests/calculation.test.cjs`, körs med projektets befintliga
TypeScript och Node-testverktyg utan genererade JavaScript-filer eller nya
beroenden. De börjar med 201, 202, 206, 207 och täcker sedan övriga fall.
Exportens och PDF:ernas tillgängliga värden för Rasch och standardfel
jämförs, liksom extremflaggor, antal, poängsummor, åldersekvivalenter,
intervall och tio kategorier.
Källornas kontrollsummor verifieras. Områdesfall och fel prövas även med
syntetiska data, inklusive 0–3 poäng, tomma områden, dubbletter, byte av urval,
misslyckad konvergens och återanvändning av samma beräkningsinstans.

**Diskuteras senare:** Grafisk presentation av kombinerade urval.
Den äldre rapportbyggaren känner fortfarande främst alla/ett område.
Ingen grafisk jämförelse, React-integration, ny filhantering eller komplett
åldersintegration ingår i 7A. Klassens äldre filmetoder och fs-import finns
kvar och anropas inte; de ska inte användas för webbläsarintegration.

### Kontroller

- `node --test tests/*.test.cjs`
- `npx --no-install tsc --noEmit --incremental false`
- `npm run lint`

Resultat: samtliga 249 tester passerar, inklusive 37 nya beräkningstester
samt befintliga filhanterings- och datumtester. TypeScript-kontrollen
passerar. ESLint rapporterar inga varningar eller fel.

Inga numeriska avvikelser utanför referensernas avrundningsprecision har
påvisats för de verifierade storheterna. Underliggande oavrundade
Windows-värden är inte tillgängliga. Modellpercentiler och ålderskoppling
återstår till 7B; rapportlayout och webbläsarintegration är inte verifierade.
Ingen ytterligare testkörning av grafisk navigation krävs av denna avgränsade
ändring eftersom React-koden inte har ändrats.

Ändrade/tillagda arbetsfiler: `src/api/skaring.ts`,
`tests/calculation.test.cjs`, `tests/fixtures/calculationReferences.json`
och detta dokument. De två nytillkomna originalreferenserna har endast
lästs. Äldre lokala dokumentändringar och objektlistan har inte bearbetats.
Etapp 7A är redo för projektägarens granskning och beslut om commit.
