# Etapp 8 – dataexport

Implementering enligt projektägarens beslut den 12 november 2026. Efter manuell
granskning har projektägaren godkänt en lokal commit av grundimplementationen.
Ingen push ingår. Windows-exporten är jämförelseunderlag med nedanstående
uttryckligen beslutade förbättringar.

## Format

UTF-8 med BOM (`EF BB BF`), tabulator mellan kolumner, CRLF efter rubrik och
varje datarad, även den sista. Exakt 18 kolumner och 17 tabulatorer per rad.
En tom sista kolumn bevaras. Standardnamn `Data.txt`; användaren kan ändra
namnet före vanlig webbläsarnedladdning.

1. FILNAVN
2. NAVN
3. KJØNN
4. FØDSELSDATO
5. TESTDATO
6. VIST ALDER
7. LOGALDER
8. MERKNAD
9. MERKNAD 2
10. OPPGAVESKÅRER
11. RASCHSKÅR
12. STANDARDFEIL
13. MINESTIMERT
14. MAKSESTIMERT
15. ALDERSEKVIVALENT
16. NEDRE GRENSE KONF.INT.
17. ØVRE GRENSE KONF.INT.
18. MODELLBASERT PERSENTIL

**Bevaras:** decimalpunkt, tre decimaler för Rasch, standardfel och tillgänglig
LOGALDER, könskoder 0/1/9, flaggor 0/1, befintliga percentiler och norska
åldersekvivalent-/intervalltexter. Standardfel redovisas numeriskt även vid
extremfall; konfidensintervallets båda fält är då tomma. Saknad ålder ger
LOGALDER `0` och tom modellpercentil. Alla områden A–E ingår alltid.

**Förbättras:** datumkolumner, visad ålder, separata anmärkningar och exakt
datumålder i LOGALDER. Uppgiftssträngen normaliseras till exakt 50 tecken ur
`0129` och omges av dubbla citattecken. Alla andra registrerade tecken och
tomma positioner blir `9` endast i export-/beräkningsunderlaget. Originalets
tecken, registreringsparser och huvudbild ändras inte.

FILNAVN, NAVN, MERKNAD och MERKNAD 2 behåller mellanslag och separata fält.
Dubbla citattecken ersätts med enkla i exportkopian. Tabulatorer och
radbrytningar avvisas; ingen tyst rensning görs. Filnamn saknar sökväg.

## Ålder och validering

`validateForSave` återanvänds utan dess dialogbeslut: endast `ready` godtas.
Ogiltiga ifyllda datum, omvänt datumpar, datumålder utanför befintligt intervall
och ogiltig icke-tom manuell ålder avbryter exporten. Inga värden blankas eller
rättas automatiskt efter valideringsfel.

Giltiga datum normaliseras med befintliga regler till DD.MM.ÅÅÅÅ. Ett giltigt
datumpar går före filens lagrade ålderstext. Den gemensamma funktionen
`resolveCalculationAge` används av beräkningsmotorn och exporten: exakt
dagsskillnad/365,25 vid giltigt datumpar, annars manuell år + månader/12 + 1/24.
Den befintliga privata åldersmetodens regler har flyttats, inte ändrats.

VIST ALDER motsvarar öppning i huvudbilden: automatisk ålder räknas om och
manuell giltig ålderstext behåller filens stavning, även eventuella inledande
nollor. Den statistiska manuella åldern använder alltid halvmånadstillägget
exakt en gång. Inga registreringsfiler skrivs om.

Förväntad LOGALDER jämfört med Windows-referensen:

| Test | Windows | Webb |
|---|---:|---:|
| 201 | 2.323 | 2.325 |
| 302 | 1.397 | 1.386 |
| 303 | 1.397 | 1.407 |
| 304 | 1.397 | 1.397 |
| 401 | 1.397 | 1.386 |
| 402 | 2.888 | 2.890 |
| 403 | 2.888 | 2.888 |

## Filflöde och integritet

HTML-filfält med `webkitdirectory`, utan File System Access API. Funktionen
kontrollerar stöd innan dialogen öppnas. Endast relativa sökvägar av formen
`vald-mapp/filnamn` behandlas. Undermappar ignoreras. Alla direktliggande filer
kontrolleras oavsett ändelse; okänd identifierare tillåts inte i massexporten.
Den befintliga parserns krav på Windows-1252, CRLF och nio ordinarie rader
behålls, inklusive att efterföljande innehåll ignoreras.

Sortering sker utan datorns språkberoende kollation: jämför filnamn efter
`toLowerCase`, sedan originalnamnet som deterministisk skiljeregel. Helt lika
namn behåller inbördes ordning genom stabil sortering. Läsning och beräkning
är sekventiella. Minst tre giltiga poäng krävs. Första läs-, format-,
validerings- eller beräkningsfel avbryter hela exporten.

Ingen nedladdningsbar fil skapas förrän hela körningen lyckats. Felmeddelandet
anger konkret filnamn och orsak enligt projektägarens beslut. Tomt filurval
ger information; avbrutet mappval avslutas tyst. Filfältet återställs före och
efter val så att samma mapp kan väljas igen. Generationsnummer gör sena
läsresultat verkningslösa efter avbrott eller avmontering.

Exportflödet saknar åtkomst till aktuell registrering, filassociation,
referenskopia och rapportinställningar. Det använder inga nätverksanrop,
persondataloggar eller beständig webbläsarlagring. Tillfälliga filreferenser
släpps när läsningen avslutas. En redan pågående `arrayBuffer`-läsning kan inte
avbrytas av API:t; dess resultat ignoreras och frigörs efter avslut.

Vanlig Blob-/länknedladdning återanvänder befintlig URL-städning. En separat
knapp för nedladdningen bevarar användaraktivering efter asynkron beräkning.
Webbläsaren bestämmer slutlig sökväg och namnkonflikter. Programmet bekräftar
endast att nedladdningen startats, inte att filen finns sparad på disk.

## Modulansvar och granskning

- `src/file/dataExport.ts`: urval, sortering, lokal parsning, validering,
  beräkning och komplett export som byteinnehåll.
- `src/domain/dateAge.ts` och `src/api/skaring.ts`: gemensam åldersupplösning.
- `src/app/useDataExport.ts`: tillfälligt React-flöde, avbrott och nedladdning.
- `src/components/DataExportDialogs.tsx`: mappfält, information, fel och
  nedladdningsdialog. Delar befintlig Modal från `FileDialogs.tsx`.
- `src/app/page.tsx` och `src/components/ArchiveMenu.tsx`: aktiverat menyval
  och gemensam upptagetspärr.
- Exporttester samt uppdaterade menytester. Befintlig referensfixtures
  källsökvägar och kontrollsumma pekar nu på 261111-exporten; inga tidigare
  statistiska förväntningsvärden ändras.

## Manuella testresultat den 12 november 2026

**Verifierat av projektägaren:** lyckad dataexport och import i Excel, korrekt
avbrott med Test399 samt med orelaterade/ogiltiga filer och korrekt hantering
av citattecken. Grundfunktionerna är manuellt granskade och får sparas i en
lokal Git-commit. Detta avser den första implementationen; samtliga detaljer
i kontrollistan nedan är inte därmed separat verifierade.

**Förbättras, beslutat men ännu inte genomfört:** justeringar av dialogtexter,
mappval och felmeddelanden samt rättelsen `RASCHSKÅRE` till `RASCHSKÅR`.
Denna commit behåller befintlig programkod och rubrik. De närmare
justeringarna hanteras i ett kommande steg enligt projektägarens återkoppling.

**Verifieras:** ett nytillkommet problem innebär att `~` i registreringsfilernas
ändelse ibland blir `_` vid nedladdning. Orsaken är ännu inte utredd och ingen
rättelse ingår här. Problemet ska utredas separat utan antagande om orsaken.

## Kontrollista och kvarvarande manuell verifiering

**Verifieras:** riktigt mappval och Avbryt i operativsystemets filväljare i
stödda webbläsare, inklusive samma mapp två gånger, tom mapp och undermappar.
Automatiserade cancel-event ersätter inte kontroll av operativsystemdialogen.

Gör en positiv körning med de 14 referensfilerna utan Test399 eller andra
filer direkt i mappen. Test403 ska innehålla tre poäng (`210`) enligt
261111-referensen. Lägg därefter till Test399 och kontrollera avbrott utan
nedladdning samt korrekt filnamn och orsak. Spara exporten utanför källmappen
eftersom en gammal exportfil annars blir en orelaterad fil vid nästa körning.

**Verifieras:** vanlig nedladdning, ändrat filnamn, avbruten nedladdning och
namnkonflikt på disk. Kontrollera bevarad öppen registrering och rapporturval.

**Verifieras:** import i Excel med UTF-8 (65001), tabulator som avgränsare,
dubbla citattecken som textavgränsare och samtliga 18 kolumner som text.
Kontrollera norska/svenska tecken, 50 uppgiftstecken inklusive inledande
nollor, datum som text, Å:M och tom sista percentilkolumn för Test209.
BOM styr kodning, inte Excels datatypstolkning.

## Genomförda kontroller

- `node --test tests/*.test.cjs`: 358 tester passerar. Exportens 17 nya
  tester jämför samtliga 14 positiva filer mot 261111-referensen med separata
  förväntningar för beslutade ändringar. Test399 kan läsas, men stoppar exporten.
- `node --test tests/dataExport.browser.cjs`: 4 tester passerar i Edge.
  Verklig byte-nedladdning av 14 filer, samma mapp två gånger, ignorerad
  undermapp, orörd registrering och rapportinställningar, Test399 utan
  nedladdning, tomt urval, cancel-event, avbruten nedladdningsdialog och sent
  läsresultat efter avbrott ingår.
- `node --test tests/navigation.browser.cjs`: 10 tester passerar i Edge.
- `node --test tests/report.browser.cjs`: 11 tester passerar i Edge.
- `npx --no-install tsc --noEmit --incremental false`: passerar.
- `npm run lint`: passerar utan varningar eller fel.
- `git diff --check`: passerar. Git meddelar att vissa arbetskopior har LF
  och normaliseras till CRLF enligt befintlig Git-konfiguration; exportens
  uttryckliga CRLF-byteformat påverkas inte.
- Skrivskyddad XML-jämförelse av Excel-referensen: 15 rader och 205 ifyllda
  textceller överensstämmer med textreferensen efter borttagning av
  uppgiftssträngens omslutande citattecken, som Excel-importen redan hanterat.
  Detta är inte ett test av ny import i Excel.

Test403 återställdes av projektägaren till tre poäng före slutkontrollerna.
Referensfilerna har inte ändrats av implementationen. Den avsiktligt ändrade
Windows-representationen för uppgifter (`d` till `9`) testas uttryckligen;
övriga statistiska exportvärden överensstämmer vid referensens precision.
Prettier finns inte installerat i projektet eller det tillgängliga runtimepaketet;
ingen formatterare eller annan dependency har installerats eller uppgraderats.

Webbläsaren och den lokala testservern kördes utanför sandboxen efter
godkännande eftersom Edge inte kunde starta inne i sandboxen. Inga externa
tjänster användes för registreringsdata. Manuella resultat och kvarvarande
verifiering skiljs åt i avsnitten ovan.

## Kontroller inför lokal commit

Den 12 november 2026 anpassades enbart testerna, efter projektägarens
godkännande, till att Test399 ligger i `datafiler/Undantagna` och Test403 nu
innehåller citattecken i anmärkningarna från den manuella provningen.
Radbrytningstestet injicerar nu radbrytningen oberoende av anmärkningens text.
Ingen programkod ändrades vid avslutningen. De historiska Windows-referenserna
behåller sitt ursprungliga textinnehåll; aktuella anmärkningar jämförs med
registreringsfilen efter den beslutade citatteckenersättningen.

Slutkontroller inför commit: 356 automatiska tester och de fyra exporttesterna
i Edge passerar. TypeScript, lint och diffkontroll passerar också. Antalet
automatiska tester är två lägre än vid första implementeringen eftersom två
befintliga filrundgångstester bara räknar direktliggande referensfiler och
Test399 nu ligger i en undermapp. Det uttryckliga negativa exporttestet för
Test399 körs fortfarande och passerar.

Committen omfattar Etapp 8-kod, tester, denna dokumentation och nödvändiga
referensfiler (261111-exporten i text/Excel, Test403 och Test399). Övriga
lokala dokumentändringar, den äldre referensfilens lokala borttagning,
261112-exporten och Word-temporärfiler lämnas utanför.

Indexets diffkontroll rapporterar en avsiktlig avslutande tabulator på rad 8
i den nytillagda Windows-referensen `261111 Dataexport.txt` (Test209).
Tabulatorn bevarar den tomma sista percentilkolumnen och ska inte tas bort.
Diffkontroll av övriga filer i index passerar.


## Beslutade förbättringar efter grundimplementationen

Utgångspunkt är `508c4b9` på `codex/huvudbild-etapp-6`. Detta avsnitt ersätter
ovanstående status ”ännu inte genomfört” för dialogtexter, mappval,
felmeddelanden och kolumnrubrik. Ingen commit eller push ingår i kompletteringen.

**Förbättras:** Arkiv → Eksporter data… visar först introduktionen med rubriken
Dataeksport och följande två stycken:

> Klikk OK for å velge mappe. Nettleseren vil deretter be deg bekrefte valget.
>
> Dataene behandles i nettleseren og blir ikke sendt til programmets nettserver.

OK stänger dialogen synkront och öppnar mappväljaren i samma användarhandling.
Avbryt, Escape och stängknappen avslutar utan mappval. Ingen extra programdialog
ligger bakom den öppna mappväljaren. Avbrutet inbyggt filval avslutas tyst.
Befintlig läs-/beräkningsdialog och dess avbrottsfunktion behålls.

**Förbättras:** Last ned dataeksport använder dynamiskt antal i texten:

> En datatabell med 14 registreringer fra den valgte mappen er klar. Velg
> filnavn og klikk «Last ned» for å laste ned tabellen.

14 ersätts med antalet exporterade registreringar. Filnamnsfält, standardnamn,
Last ned, Avbryt och nedladdningsmekanism är oförändrade.

**Förbättras:** läsfel och fel där parsern inte kan identifiera en giltig
registreringsstruktur ger `Kunne ikke åpne filen.`. Läsbar struktur med okänd
identifierare ger `Ukjent filformat.`. Detta motsvarar åtskillnaden vid Åpne.
Exporten visar fortfarande orsaksfilen och att ingen exportfil laddats ned;
formatvarningen erbjuder ingen möjlighet att fortsätta massexporten.
Datum-/åldersfel och exempelvis Test399 behåller sina mer informativa orsaker.
Punkten efter orsaken hanteras så att de nya formuleringarna inte får dubbel punkt.

**Förbättras:** kolumn 11 heter nu `RASCHSKÅR`. Position, innehåll, precision och
beräkningar är oförändrade. Windows-referensens ursprungliga rubrik ändras inte.

**Bevaras:** sortering, sekventiell Windows-1252-inläsning, alla områden A–E,
18 kolumner, BOM, CRLF, uppgiftsnormalisering, citatteckenhantering och totalt
avbrott utan partiell nedladdning. Originalregistrering och rapportinställningar
är fortsatt åtskilda från exportflödet.

**Bevaras:** ingen automatisk namnändring, ny nedladdningsmekanism eller särskild
användarvarning införs för Chromium och tilde. Se [Filhantering i webbprogrammet](Filhantering_webb.md).

### Slutkontroller av kompletteringen

- `node --test tests/*.test.cjs`: **360 tester passerar**. Fyra nya
  filhanteringstester öppnar samma referensinnehåll som `Test403.~Z4`,
  `Test403._Z4`, `Test403.txt` och utan ändelse, och kontrollerar att valt
  nedladdningsnamn och byteinnehåll lämnas vidare oförändrade.
- **Edge 157.0.4341.46 på Windows:** sju export-/filnamnstester och tio
  befintliga navigationstester passerar.
- **Norton Secure Browser 154.0.35683.100 på Windows:** samma sju
  export-/filnamnstester passerar med separat tillfällig testprofil.
- Webbläsartesterna verifierar introduktionens exakta text, inga mappval före
  OK, OK, Avbryt, Escape, stängknapp, native cancel-event, dynamiska antal
  14 och 1, förenklade felorsaker, Test399, totalavbrott, ny kolumnrubrik och
  oförändrade registreringsfält/rapportinställningar. Tidigare kontroller av
  alla 14 referensfiler, BOM, 18 kolumner, CRLF, upprepat mappval och sena
  läsresultat efter avbrott ingår fortfarande.
- I båda webbläsarna observeras `Test403.~Z4` i länkens download-egenskap,
  medan nedladdningen får namnet `Test403._Z4`. Den faktiskt nedladdade
  filen återöppnas via Åpne med oförändrat innehåll. Öppning utan ändelse
  fungerar också, och registreringsfilfältet har inget accept-filter.
- `npx --no-install tsc --noEmit --incremental false`, `npm run lint` och
  `git diff --check` passerar. Inga paket installeras eller uppgraderas.

Webbläsartesterna körs mot lokal testserver på port 3001 med Playwright från
den befintliga arbetsmiljön. Norton väljs med
`NUBU_BROWSER_EXECUTABLE=C:\Program Files\Norton\Browser\Application\NortonBrowser.exe`;
utan detta används Edge. Ingen vanlig användarprofil ändras.

**Verifieras manuellt före godkännande:** operativsystemets mappdialog och
bekräftelse i vanlig interaktiv Edge/Norton, inklusive avbrott, samt den nya
dialogutformningen och Excel-import av exporten med rättad rubrik. De
automatiska testerna väljer verkliga lokala testmappar via Playwright, men
ersätter inte granskning av operativsystemdialogens utseende. Andra
webbläsarversioner och operativsystem är inte provade i denna komplettering.

Inga avsiktliga avvikelser från det beslutade uppdraget. Tre programfiler
ändras: `useDataExport.ts`, `DataExportDialogs.tsx` och `dataExport.ts`.
Tre testfiler samt denna dokumentation och den nya kompletterande
filhanteringsdokumentationen uppdateras. Orelaterade lokala dokument och
referenser lämnas orörda. Ingen commit eller push görs.

### Slutlig textjustering och lokal Git-commit

Efter projektägarens godkännande ändras endast introduktionens sista mening
från ”Dataene behandles i nettleseren og sendes ikke til programmets nettserver.”
till ”Dataene behandles i nettleseren og blir ikke sendt til programmets nettserver.”
Den exakta textkontrollen och dokumentationens dialogcitat uppdateras samtidigt.
Inga andra funktioner eller dialogtexter ändras i detta sista steg.

Utvalda slutkontroller: 47 tester i `dataExport.test.cjs` och
`browserFiles.test.cjs`, samt introduktionsdialogens automatiska webbläsartest
i Edge 157.0.4341.46 passerar. TypeScript, riktad lint av de tre ändrade
programfilerna och diffkontroll passerar också. Tidigare fullständiga resultat
för Edge och Norton redovisas ovan. Ingen ny manuell testomgång utförs eller
krävs för denna textändring enligt projektägarens beslut.

Projektägaren har nu godkänt en lokal commit med samtliga godkända förbättringar
sedan `508c4b9`, inklusive denna textjustering, tester och tillhörande
dokumentation. Detta ersätter ovanstående besked om att avvakta commit.
Orelaterade lokala filer lämnas utanför. Ingen push ingår.
