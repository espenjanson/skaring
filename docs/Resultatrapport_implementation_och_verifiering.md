# Resultatrapport implementation och verifiering

Utgångspunkt: `97961671e0f325122b769a82706bc57bc2e62061`, gren
`codex/huvudbild-etapp-6`. Uppdraget omfattar hela rapporten efter 7C1.
Status 2026-11-03: **7C2 är implementerad men ännu inte manuellt eller
visuellt godkänd av projektägaren.** Manuell och visuell granskning skjuts
upp till nästa arbetspass. Projektägaren har godkänt versionssparande av
etappen med commit; ingen push ska göras av Codex. Alla kvarstående
avvikelser och frågor nedan bevaras inför nästa arbetspass.
Originalreferenser har inte ändrats av Codex.

## Implementerat

**Bevaras:** registreringsmodell, filhantering, huvudbild, åldersprincip,
verifierade beräkningsformler, kalibreringar och resultatinställningarnas
livslängd. Tomt urval och otillräckligt underlag lämnar vyn öppen och visar
endast respektive meddelande på den vita ytan. Inga gamla resultat visas.

**Förbättras:** resultatet renderas som en vit A4-sida i React/SVG med
20 mm marginaler. Samma objektmodell används på skärm och vid utskrift.
Kontrollerna har Tilbake, den diskreta rubriken Vis resultat, ramen med
Resultatet beregnes ut fra:, A-oppgaver–E-oppgaver, Rasch-val till höger
vid tillräcklig bredd och Skriv ut… på egen rad. På smala skärmar flödar
kontrollerna om medan A4-sidan behåller sina proportioner.

`ReportGraphics` är en liten underklass till `Skaring`. Den implementerar
de befintliga ritkommandona och samlar typade fält, linjer och rektanglar.
Basklassens `setGraph` återanvänds för definitioner, dynamisk synlighet,
uppgiftstexter, färg, fetstil, skattningslinje, intervall och det sammanhängande
resultattextfältet. Saknade identiteter och dubbletter ger explicita fel.
Objektens namn matchas skiftlägesoberoende, som i den äldre miljön:
EstimateLine/estimateline och MeasurePromptR/measurepromptR är samma objekt.

`ReportPage` ritar objektmodellen i ett enda viewBox, `0 0 21000 29700`.
SVG används för geometrin och fasta `foreignObject`-rektanglar för text.
Det är inbyggd React/HTML/SVG och kräver inga nya paket eller nätanrop.

Resultattexten är ett sammanhängande fält med
`font-family: "Courier New", Courier, monospace`, 8 pt och 10 pt radavstånd (1,25).
Blanksteg, indrag, radbrytningar, tabellkolumner, X och likhetstecken
återges utan HTML-omflödning. Övrig liten text är 8 pt Arial/Helvetica;
huvudrubriken är 18 pt fetstil. Sidfoten är två rader i 8 pt.
Rasch-tal och standardfel använder befintlig `toFixed(2)`, och skalans
etiketter är befintliga strängar med decimalpunkt. Inga lokaliserade
formatterare används.

### Presentationens rättningar

1. `gItemLabels` initierades tidigare genom reduce på en gles array och
   blev tom. Etiketterna genereras nu korrekt som A1–E10. Det ändrar inga
   poäng, uppgiftskalibreringar eller statistiska beräkningar.
2. Skattningslinjen uppdaterades till `rightPU`, skalans högra kant, trots
   att definitionen redan spänner till x=8460. Den behåller nu denna högra
   kant över uppgiftskolumnerna. Detta stöds av den befintliga definitionen,
   referensbilderna och OpenScript rad 1715 (`rightPT`). CI förblir på skalan.
3. Notat: ersätts med Navn: i rapportmodellen och huvudrubriken får den
   uttryckligen beslutade texten Resultat for motoriske oppgaver i NUBU 4-16.
4. Tabellseparatorns fyra mellanrum återställs. OpenScripts `&&` lägger
   till blanksteg, vilket saknades i TypeScript-översättningen. En extra
   tomrad före tabellrubriken tas bort genom att låta tabellfunktionen
   själv tillföra radbrytningen, som i OpenScript. Kolumnmarkeringar och
   alla numeriska värden är oförändrade.
5. Den fasta områdesrubriken ersätts av en grammatiskt sammanfogad beskrivning
   i A–E-ordning. Den centreras i en 65 tecken bred likhetsteckenrad.
   Alla fem områden ger bara den vanliga likhetsteckenraden.

Exempel: Beregnet ut fra A-oppgaver; Beregnet ut fra A- og B-oppgaver;
Beregnet ut fra A-, B- og C-oppgaver; Beregnet ut fra B-, D- og E-oppgaver.

Genomgången fann ingen ändring av beräkningsvariabler i `setGraph`.
Den återställer endast presentationsrektangeln `graphicBounds` till den
redan angivna A4-ytan. Tester jämför alla g-variabler, kalibreringar och
åldersvisning före och efter upprepad rapportgenerering. De är oförändrade.
Originalregistreringen är också oförändrad.

## Källor och objektinventering

Primär källa är `src/api/skaring.ts`. Inventeringen omfattar 122 aktiva
fält-/linjedefinitioner och CI. Deras koordinater har återanvänts direkt.
Tester läser även TypeScript-syntaxträdet och jämför modellens statiska
koordinater mot dessa definitioner; de återskapas inte från äldre källor.

Kompletterande kontroll gjordes mot:

- `docs/legacy-openscript/Kildekode til Motoriske oppgaver i NUBU 4-16 v39 eksportert 19.1.2022.txt`.
- `docs/legacy-openscript/Objektlista foer grafisk outputsida v2.xlsx`,
  särskilt Original och dess bearbetningar. Arbetsboken beskriver främst
  v56 från 2023 och används som kontroll, inte som en ny normerande layout.
- `docs/Dokumentation till Win-programmet v03 staemmer med gammal layout.docx`,
  avsnitt Resultatbild och bilden med röda markeringar av saknade fält.
- Windows-PDF:erna i `docs/reference-tests/rapporter/` och 7A/7B:s
  referenstabell. Test401 tillkom under arbetet och används som långtextprov.

Slutlig objektmodell innehåller **130 unika identiteter**:

| Grupp | Identiteter/antal |
|---|---|
| Åldersskala | Graph1, ageline1–14, ageprompt1–14, AgeEquivPrompt |
| Rasch-skala | measureTick4–16, measureprompt4–16, MeasurePromptR |
| Områden | AreaPrompt_A–E |
| Uppgifter | item_1–50 |
| Dynamisk grafik | EstimateLine, CI |
| Ursprungliga person-/textfält | headingfield, led_navn, navn, led_kjonn, led_alder, alder, output, copyright |
| Kompletterade fält | led_fodtdato, fodtdato, led_testdato, testdato, merknad, merknad2 |
| Bevarade men dolda äldre etiketter | led_merknad_NOT_USED, led_merknad2_NOT_USED |

Graph1 är den saknade synliga skalramen. Dess rektangel finns redan som
`rectangleGraph` och i ett kommenterat ritkommando i TypeScript. Den ritas
nu bakom skalans övriga objekt. TextAlignField var en placeringsreferens;
ritning av en fylld rektangel där skulle dölja grafiken och har inte lagts
till. Kommenterade tickar/etiketter utanför skalan används inte. Inga
nödvändiga objekt är fortfarande oimplementerade enligt denna inventering.

### Kompletterat personhuvud

**Dokumentationsbaserad anpassning, kräver visuell slutgranskning:** de
saknade personobjektens exakta 2021-koordinater finns inte i den primära
TypeScript-koden. Positionerna nedan har kompletterats efter fördelningen
i dokumentationsbilden, i samma ToolBook-system. Befintlig grafik har inte
flyttats för att skapa utrymme.

| Fält | ToolBook-rektangel x1,y1,x2,y2 |
|---|---|
| led_kjonn | 912,1110,3273,1425 |
| led_alder | 8150,1110,8675,1425 |
| alder | 8700,1110,9249,1425 |
| led_fodtdato | 3700,1110,4800,1425 |
| fodtdato | 4800,1110,5950,1425 |
| led_testdato | 6000,1110,6900,1425 |
| testdato | 6900,1110,8100,1425 |
| merknad | 912,1440,4670,2115 |
| merknad2 | 4950,1440,9027,2115 |
| output, anpassad överkant | 924,2175,9180,8424 |
| copyright, två rader | 516,14340,9570,14790 |

Namnets ursprungliga rektangel behålls men texten är en enda rad.
Anteckningarnas två rektanglar har identisk höjd, cirka 11,84 mm, och
skilda värden utan ledtexter. Namn och anteckningar har overflow hidden,
fast teckenstorlek och expanderar aldrig. Könsvärdet tabuleras till
namnkolumnen. Outputfältets överkant flyttas för att lämna plats för de
saknade anteckningarna. Grafiken behåller sina ursprungliga koordinater.

Sidfotens överkant flyttas upp inom den ursprungliga nedre zonen för att
rymma de två beslutade raderna. Den börjar cirka 269,11 mm från sidans
överkant och slutar vid 277 mm; nedre grafikfält slutar tidigare.
Ingen kollision med grafiken påvisades.

## A4 och koordinater

`convertVertices` använder oförändrat rektanglarna:

- ToolBook: x=15–9570, y=132–14790.
- A4-innehåll: x=2000–19000, y=2000–27700, enhet 1/100 mm.

Båda hörnen och mittpunkten är automatiskt kontrollerade.
Omräkningsfaktorerna är 17000/9555 i x och 25700/14658 i y, cirka
1,5 procent olika normalisering av källaxlarna. Själva omräkningsformeln
är bevarad. Vänstergränsen rättades från 516 till 15 efter projektägarens
uttryckliga godkännande under A4-jämförelsen. Excel-inventeringen anger
minsta x=15 och den nya A4-referensen bekräftar detta. Resultatfältets
vänsterkant blir cirka 36,17 mm i stället för 27,66 mm; Windows-PDF:n
visar cirka 36,24 mm. Objektens egna statiska koordinater behålls.
Den färdiga A4-modellen skalas likformigt på skärm och vid utskrift.

**Objekt utanför marginalerna: inga.** Alla synliga objekts geometrier
har kontrollerats mot 20–190 mm horisontellt och 20–277 mm vertikalt.
Separat kontroll av synliga textglyfer i sju Edge-PDF:er gav cirka
x=35,85–180,02 mm och y=20,75–275,42 mm, inom 20–190 mm i x och
20–277 mm i y. Fältspecifik avsiktlig klippning
av lång text är skild från oavsiktlig klippning vid papperskanten.

Skärm-/utskriftsmätningen omfattar varje synligt objekts position och
storlek. Största uppmätta skillnaden var cirka 0,0029 mm, under den
angivna toleransen 0,01 mm för Chromiums avrundning av DOM-rutor till
1/64 CSS-pixel. Modellkoordinaterna är exakt desamma.

## Utskrift

Skriv ut… anropar `window.print()` och öppnar webbläsarens vanliga dialog.
Knappen är avstängd när resultatet är ogiltigt. Utskrifts-CSS döljer
kontrollområdet, navigation och dialoger, samt hela resultatvyn om den
bara innehåller ett felmeddelande. Endast den vita giltiga rapporten blir
kvar. A4 definieras genom @page med noll yttre marginal; rapportens egna
20 mm ligger inuti SVG-sidan.

Sju PDF-prov via Edge gav **exakt en sida vardera**. Inga extra blanka
sidor eller oavsiktligt bortklippta fasta etiketter påvisades. PDF-mediets
mått var cirka 209,889 × 297,011 mm, vilket är Chromiums avrundning av
nominell A4. Utskrift till fysisk skrivare är inte provad.

## Verifiering jämfört med implementation

**Automatiskt verifierat:** alla identiteter, ursprungliga statiska
koordinater, dynamisk grafik, synlighet, färg, fetstil, fasta fält,
alla 31 områdeskombinationer och områdestexter, Rasch av/på, decimalpunkt
under nb-NO, sidfot, oförändrade beräkningar/registreringar och tidigare
filhantering. Inga fasta rapporttexter utom avsiktligt klippt långtext
överflödade sina fält i webbläsarproven.

**Visuellt kontrollerat:** skärmbilder, PDF-rendering av 201 med Rasch och
översiktsrenderingar av 205, 206, 207 och 208 C; 201 utan Rasch och med
A-urval finns också som enskilda PDF-/bildprov. Långtextfallet 401 och
kontrollområdet vid 641/320 px har granskats. Kontrollen avser innehåll,
relativa placeringar, synlighet och tydliga kollisions-/klippningsfel.
Det är inte en fullständig pixelmatchning eller ett godkännande från
projektägaren av de kompletterade personfälten. Efter vänstergränsrättningen
har de nya 201-A4-bilderna också jämförts direkt med Windows-A4 underlaget.
Samtliga 23 slutligt tillgängliga A4-referenser kontrollerades separat
för åldersekvivalent, intervallgränser och modellpercentil samt exakt
Rasch-/standardfelsvisning där sådana värden redovisas. Alla stämde med
respektive registrering och urval, inklusive 205 A och 401-varianterna.
Projektägaren rättade felmärkta referenser under arbetet; den sista
kontrollen gjordes efter dessa rättningar. Detta är en lokal
extraktions-/jämförelsekörning med pdfplumber och projektets adapter,
utöver Node-/Edge-testsviterna. Mätresultat finns i granskningskatalogen.

**Skillnader och återstående granskning:**

- De ursprungliga PDF:erna har Letter-format (612 × 792 pt). Under arbetet
  tillförde projektägaren A4-kopior (595 × 842 pt) i `rapporter/A4/`.
  Filnamnen för två felmärkta 201-varianter rättades av projektägaren;
  jag ändrade inga referensfiler. A4-kopiorna används nu för ytterligare
  numerisk och visuell jämförelse. Letter-originalens kontrollsummor är kvar.
  Det är den nya A4-jämförelsen som avslöjade och bekräftade vänstergränsen 15.
- Personhuvudets kompletterade koordinater ovan är visuellt härledda,
  inte uppmätta originalkoordinater. De behöver projektägarens granskning.
- Windows-A4-exemplet har cirka 10,56 pt radavstånd i resultattexten.
  Här används 10 pt för att det längsta områdes-/Rasch-blocket ska ligga
  ovanför de oflyttade grafikrubrikerna. Detta är en dokumenterad kompaktare
  presentation, inte automatisk förminskning av text. Absolut y-placering
  och denna återstående radavståndsskillnad behöver visuell slutgranskning.
- Browser-Arial ersätter MS Sans Serif; Courier New används uttryckligen
  enligt uppdraget. Windows-PDF:erna använder bland annat Helvetica och
  Courier. Fontmått, rasterisering och viss radbrytning kan därför skilja.
- CI återges med transparent, jämn 25-procentig svart fyllning i stället
  för ToolBooks rastermönster. Den ligger i källans lagerordning.
- Befintliga TypeScript-texter, exempelvis vissa åldersgruppers bindestreck
  och Samleskår i stället för äldre PDF:ers Samleskåre, är bevarade.
  Inga oombedda språkjusteringar har gjorts utöver beslutade rubriker.
- De två numeriska kompatibilitetsfrågorna från 7B, exakt 18:0 och exakt
  halva 0,05-steg, kvarstår oförändrade. De är inte nya grafikfel.

De avsiktligt nya huvud- och sidfotstexterna samt kombinerade områdesurval
avviker enligt uttryckligt beslut från de äldre rapporterna.

## Ändrade filer

- `src/api/skaring.ts`: etikettinitiering, skattningslinjens utsträckning,
  typad koordinatomräkning, godkänd vänstergräns 15, tabellseparatorer och dynamisk områdesrad. Inga statistikformler ändrade.
- `src/report/graphics.ts`: typad grafisk modell och ritkommandon, kompletterat personhuvud.
- `src/components/ReportPage.tsx`: skalbar SVG-/text-rendering.
- `src/components/ResultView.tsx`: kontroller och A4-vy med utskriftskommando.
- `src/app/registration.css`: kontrollayout och skärm-/utskriftsregler.
- `src/domain/results.ts`: skapar rapportmodellen från samma verifierade beräkningsinstans.
- `tests/report.test.cjs`: 19 objekt-/geometri-/tillståndstester.
- `tests/report.browser.cjs`: 9 Edge-tester inklusive utskrift och långtext.
- `tests/navigation.browser.cjs`: tidigare navigationsprov anpassade till beslutade ledtexter och sammanhängande resultattext.
- `tests/results.test.cjs`: tidigare adapterprov anpassat till valbar grafisk rapport.
- `tests/nubu100.test.cjs`: kräver fortsatt de elva ursprungliga referensfilerna och testar även nytillkomna filer utan fast totalantal.
- `tests/fixtures/calculationReferences.json`: endast sökvägen Test208Alle.pdf → Test208AlleRasch.pdf ändrad efter projektägarens filnamnsrättning. SHA-256 är oförändrad; filinnehåll och referensvärden har inte ändrats.
- `docs/Resultatrapport_implementation_och_verifiering.md`: detta dokument.

Vid versionssparandet ingår även projektägarens tillkomna A4-referenser,
Test401.~Z4, Test401Alle.pdf, Test401.png och namnbytet av den byte-identiska
Test208Alle.pdf till Test208AlleRasch.pdf. De är avsiktligt referensunderlag,
inte genererade testutskrifter. Efter projektägarens kompletterande beslut
att även spara dokumentändringarna ingår dessutom Windows-dokumentationen
i Word, Excel-listan över testfiler, Excel-objektlistan, dataexportreferensen
från 2026-11-03 och den tidigare tillagda Test205A.pdf. Dessa dokumentändringar
kommer från projektägaren och har inte bearbetats av Codex. Word och Excel
är stängda vid versionssparandet. Låsfiler och granskningsutskrifter i
visualiseringskatalogen ingår inte.

## Testkörningar

- `node --test tests/*.test.cjs`: 327 passerade tester, inklusive 19 nya rapporttester och den nytillkomna filreferensen.
- `node --test tests/navigation.browser.cjs`: 10 passerade Edge-tester.
- `node --test tests/report.browser.cjs`: 9 passerade Edge-tester.
- `npx --no-install tsc --noEmit --incremental false`: godkänd.
- `npm run lint`: inga varningar eller fel.
- `git diff --check`: program- och dokumentationsändringarna är godkända. Vid versionssparandet markerar Git en bevarad avslutande tabb i originalexportens rad för 209; den är den tomma sista percentilkolumnen och ändras inte.
- Separat A4-referensjämförelse: 23 av 23 rapporter överensstämmer för de kontrollerade resultatvärdena och presentationsgränserna.

Testmiljön använder projektets befintliga beroenden och runtime-Playwright.
Inga paket eller verktyg har installerats eller uppgraderats. Headless Edge
kördes lokalt utanför sandlådan mot Next på port 3001. Gransknings-PDF:er,
bilder och mätdata ligger i chattens separata visualiseringskatalog, inte i
referensmaterialet eller källträdet.
