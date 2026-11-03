# Etapp 7B – ålderskoppling, modellpercentiler och gränsfall

Utgångspunkt: `846d074246b59a713eb91072983ed9ccbbe79395`, gren
`codex/huvudbild-etapp-6`. Inga commits eller push ingår i uppdraget.
Originalreferenser, registreringsmodell, filhantering och React-resultatbild
är oförändrade. Referenstabellen från 7A återanvänds utan ändring:
[`calculationReferences.json`](../tests/fixtures/calculationReferences.json).

## Ålderskoppling

**Bevaras:** Rasch-formeln, standardfelet, kalibreringsvärdena,
ålderstransformationen `(-a/b) + ln(ålder)/b`, 0,05-avrundningen och
modellpercentiltabellen. Åldersekvivalent och faktiska percentilkategorier
är åldersoberoende; barnets ålder används för modellpercentilen.

**Förbättras:** `calculateRegistration` och `prepareInputForOutput` tar nu
även registreringens befintliga ålders-/datumfält. Dessa är valfria för att
behålla stöd för fristående poängberäkning. Efter en lyckad poängberäkning:

1. `dateAge(birthDate, testDate)` avgör om ett giltigt datumpar finns enligt
   den befintliga modulens validering och åldersgränser. Vid `kind: valid`
   används `exactYears` i `gAlder` och `displayAge` i `alder_value`.
   Ett eventuellt gammalt manuellt Å:M-värde används då inte.
2. Om datumåldern inte är giltig prövas en uttrycklig manuell ålder med
   befintlig `manualAgeError`. Den måste vara icke-tom och ligga inom
   befintligt intervall 1:6–99:11. Beräkningsåldern blir
   `år + månader/12 + 1/24`. Halvmånadstillägget görs en gång.
3. En tidigare automatisk åldersvisning (`ageSource: automatic`) används
   inte som manuell reserv om datumen har blivit ogiltiga. Vid saknad
   proveniens, exempelvis fristående testindata, räknas ett giltigt
   uttryckligt åldersfält som manuellt. Saknas användbar ålder förblir
   `gAlder` -9999 och visningstexten tom; Rasch, standardfel,
   åldersekvivalent och faktiska kategorier kan fortfarande beräknas.

Även om datum har korrekt kalenderformat kräver `dateAge` att paret ligger
inom dess befintliga intervall och i rätt ordning för att vara giltigt.
Dessa regler ändras inte i 7B. Saknas ett sådant par kan en giltig manuell
ålder användas enligt ovan. Originalregistreringen skrivs aldrig om.

Klassens äldre `validDateSecondsFromNorwegian` och `yearMonthToDec` används
inte i den nya kopplingen. Tester ersätter dem med funktioner som kastar fel
för att kontrollera detta. Beräkningsålder och tidigare åldersresultat rensas
vid varje försök, även vid avslagna urval, felaktigt underlag eller utebliven
konvergens.

## Modellpercentil och resultatstatus

`modelPercentile()` använder en gemensam kedja:

`Rasch - ageToMeasure(gAlder, 1.968, 0.254)` → avrundning till närmaste
0,05 → första tabellgräns som är större än eller lika med det avrundade
värdet, med tabellens yttre gränsvärden 0 och 100.

Metoden räknar från det aktuella beräkningsresultatet. Den lagrar inget
separat percentilvärde som kan bli kvar efter en ändring. Den äldre
rapporttexten använder samma metod; ingen React-koppling har tillkommit.

- `missing`: poängberäkning saknas eller misslyckades.
- `not-computable`: poängberäkningen lyckades men användbar ålder saknas.
- `available`: numerisk percentil, inklusive giltiga värden 0 och 100.

Icke-beräkningsbara resultat ersätts inte med noll. Modellpercentilens
saknade ålder påverkar inte möjligheten att räkna övriga resultat.

## Windows-verifiering

Källor är de elva exportraderna och arton rapporterna i 7A-tabellen, med
källfil, rad/sida, precision och kontrollsummor. De kontrolleras fortsatt
mot oförändrade original. Exportraderna finns i
[`261103 Dataexport referensfall.txt`](reference-tests/rapporter/261103%20Dataexport%20referensfall.txt).
Test205A.pdf behandlas fortsatt som alla områden utifrån rapportens innehåll.

| Fall | Beräkningsålder | Visad ålder | Modellpercentil, webb/Windows |
|---|---|---|---|
| 201 | 10,223134839151266, exakt datumålder | 10:2 | 4 / 4 |
| 202 | 10 + 5/12 + 1/24 | 10:5 | 6 / 6 |
| 205 | 17 + 3/12 + 1/24 | 17:3 | 54 / 54 |
| 206 | 5 + 2/12 + 1/24 | 5:2 | 0 / 0 |
| 207 | 17 + 8/12 + 1/24 | 17:8 | 100 / 100 |
| 208 | 4 + 6/12 + 1/24 | 4:6 | 54 / 54 |
| 209 | saknas | tom | ej beräkningsbar / ej beräkningsbar |
| 301 | 10 + 2/12 + 1/24 | 10:2 | 1 / 1 |
| 302 | 1461/365,25 = 4 | 4:0 | 35 / 35 |
| 303 | 1491/365,25 ≈ 4,082135523613963 | 4:0 | 31 / 31 |
| 304 | 4 + 1/24 ≈ 4,041666666666667 | 4:0 | 34 / 34 |

Samtliga tillgängliga modellpercentiler i PDF-varianterna, inklusive
enskilda områden A/C, jämförs också exakt. 209 förblir ej beräkningsbar.
Rasch och standardfel kontrolleras fortsatt med tolerans ±0,0005 mot
exportens tre decimaler och ±0,005 mot PDF:ernas två decimaler.
Flaggor, poängantal, poängsummor, åldersekvivalenter, intervalltexter och
faktiska percentilkategorier jämförs exakt som i 7A.

**Avsiktlig åldersprincip, ingen observerad referensavvikelse:** exakt
datumålder går före visad månadsålder. 302–304 får därför tre olika
modellpercentiler trots samma visade 4:0. Detta överensstämmer med deras
Windows-resultat. Inga procentilavvikelser behöver undantas i testerna.
Exportens LOGALDER är däremot 1,397 i alla tre och ska inte användas för
att rekonstruera exakt datumålder. Den äldre exporten logaritmerar visad
ålder med halvmånadstillägg; LOGALDER verifieras inte som exakt datumålder.

## Områdesurval och gränstester

Alla 31 icke-tomma kombinationer A–E testas, från ett till fem områden.
För varje kombination kontrolleras:

- Maskerat underlag och samma resultat som en ny instans med motsvarande
  registrering; ändringar utanför urvalet saknar påverkan.
- Sammanlagt 0, 1, 2 respektive 3 giltiga uppgifter.
- Alla giltiga poäng 0 respektive 2 och korrekta extremflaggor.
- Att enbart ett av de valda områdena får innehålla poäng, även när de
  andra är helt tomma. Varje valt område prövas som det enda aktiva.
- Tomt urval, återgång efter misslyckande och upprepade beräkningar.

Områdesurvalet behövde inga ytterligare programändringar efter 7A.
Kombinationer saknar Windows-facit och verifieras därför genom
underlagskontroll, isolering och överensstämmelse med färska beräkningar;
detta hålls isär från de faktiska Windows-jämförelserna.

Gränstester täcker alla 30 faktiska kategoritrösklar på, strax under och
strax över gränsen. Modellpercentiler testas runt samtliga 0,05-cellgränser
från strax under tabellens nedre gräns till strax över den övre, samt
utvalda exakta positiva och negativa halva steg, luckor i tabellen och
0/100. Befintlig JavaScript-avrundning (`Math.round`, halva steg mot +∞)
bevaras. Windows-facit för exakta avrundningsties saknas; dessa syntetiska
tester verifierar TypeScript-beteendet, inte ToolBooks tie-regel.

Åldersekvivalent och samma uttryck för konfidensintervallets ändpunkter som
används av rapportbyggaren testas vid och omkring 3:6 samt på var sida om
18:0. Befintliga PDF-fall täcker intervall som passerar dessa gränser och
extremfall där intervall inte kan redovisas. Ett textintegrationstest
kontrollerar 302–304, 209, 206 och 207 via den befintliga rapportbyggaren
utan att skapa någon React-resultatbild.

## Öppen kompatibilitetsfråga: exakt 18:0

**Diskuteras/verifieras senare, oförändrat i 7B:** vid ett matematiskt
18-årsvärde kan IEEE-754-aritmetik ge `17.999999999999996`. Den nuvarande
trunkeringen visar då 17:11. En algebraiskt likvärdig invers kan i stället
ge `18.000000000000004`, vilket visas som `Høyere enn 18:0`.

Testet `known exact-18 floating-point behavior is retained pending Windows
evidence` dokumenterar båda befintliga utfallen. Det är ett test av ett
känt nuvarande beteende, inte ett godkännande av önskat resultat eller
belägg för Windows-överensstämmelse. Övriga gränstester använder explicit
angivna avstånd från flyttalsgränsen och kan inte lösa denna fråga.

Projektägaren har under arbetet prioriterat Windows-överensstämmelse och
valt att dokumentera frågan för senare testning. En mycket snäv avrundning
bedöms av projektägaren som rimlig, men genomförs inte i denna etapp.
Nästa steg är ett riktat Windows-facit vid gränsen och jämförelse med
OpenScripts transformation, jämförelser och trunkering innan eventuell
rättning. Inga formler, tabellvärden eller presentationsgränser ändras här.

## Ändrade filer och kontroller

- `src/api/skaring.ts`: ålderskoppling, typad percentilstatus och gemensamt
  percentilanrop från befintlig rapporttext.
- `tests/calculation.test.cjs`: återanvänder 7A-tabell och befintlig
  TypeScript-testladdare för datumfunktionerna; utökad referens- och
  gränsverifiering. Ingen ny testinfrastruktur eller paketinstallation.
- `docs/Etapp_7B_alderskoppling.md`: detta dokument.

Genomförda slutkontroller:

- `node --test tests/*.test.cjs`
- `npx --no-install tsc --noEmit --incremental false`
- `npm run lint`
- `git diff --check`

Resultat: samtliga **292 tester passerar**, inklusive 80 beräkningstester
(43 fler än i 7A) och alla befintliga filhanteringstester. TypeScript-kontrollen
passerar och ESLint rapporterar inga varningar eller fel. `git diff --check`
passerar. Inga paket har installerats. Ingen commit eller push har gjorts.

Etappen är klar för granskning. Den exakta flyttalsgränsen vid 18:0 och
Windows tie-regel vid exakt halva 0,05-steg förblir uttryckliga
kompatibilitetsfrågor för senare riktad verifiering, utan ändrat beteende.
Inga nya åldersavvikelser mot de befintliga Windows-referenserna har påvisats.
