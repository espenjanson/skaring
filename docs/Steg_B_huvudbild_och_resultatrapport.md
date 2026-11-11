# Steg B – huvudbild och A4-resultatrapport

Implementerat 2026-11-11 på `codex/huvudbild-etapp-6`, efter `c555f9e`.
Steg B1–B8 är manuellt granskat och godkänt i sin helhet av projektägaren.
Samlad commit är godkänd; ingen push ska göras av Codex.

## Genomförda ändringar

- **B1, Förbättras:** den tillfälliga datum-/åldersinformationen längst ned
  på huvudbilden och dess CSS-regel har tagits bort. Ordinarie filstatus,
  meddelanden och kontroller är kvar.
- **B2, Verifieras:** ett separat litet utskriftshjälpobjekt sätter titeln
  till `Resultat <filstam>` omedelbart före befintliga `window.print()`.
  Endast sista filändelsen tas bort. Utan känd filassociation används
  `Resultat`. Webbläsaren ansvarar för `.pdf`. Personnamn används aldrig.
  Ursprungstiteln och händelselyssnaren återställs via `afterprint`, Tillbaka,
  avmontering eller undantag vid utskriftsstart. Ingen timer används.
  Känd fil betyder den redan befintliga filassociationen från Åpne; någon
  ny filassociation eller historik över nedladdningsnamn införs inte.
- **B3, Förbättras:** könsvärdet får samma exakta x-position som namnvärdet,
  genom två kolumner inom befintligt könsobjekt. Datumvärdena flyttas
  närmare etiketterna: födelsedatum från x=4800 till 4550 och testdatum
  från 6900 till 6700 i ToolBook-enheter. Anteckningarnas gemensamma
  horisontella yta x=912–9027 delas lika med mellanrum 280 enheter
  (4,98 mm). Båda fälten blir 69,70 mm breda. Y-positioner och höjder behålls.
- **B4, Förbättras:** ej utförda uppgifter ändras från `#bfbfbf` (191)
  till `#cccccc` (204). Utförda uppgifter behåller svart och poängens fetstil.
- **B5, Förbättras:** båda numeriska Rasch-/SE-fälten högerjusteras med
  inledande blanksteg till fem tecken via `padStart(5)` efter oförändrad
  `toFixed(2)`. Decimalpunkterna sammanfaller för positiva och negativa
  ensiffriga estimat. Etiketter och Courier-typsnitt är oförändrade.
- **B6, Förbättras:** endast den extra radbrytningen efter områdesurvalets
  första avgränsningsrad tas bort. Resultattextens generella radavstånd
  och övriga radbrytningar behålls.
- **B7, Förbättras/Verifieras:** A–E-rubrikernas radavstånd minskas från
  1,12 till 1,00, alltså från 8,96 till 8 punkter. Ingen koordinat ändras.
  Det automatiska Edge-testet för 205 med A-urval placerar skattningslinjen
  vid övre gränsen 18:0 och kontrollerar att samtliga rubrikers faktiska
  textytor slutar ovanför linjens övre kant. Windows `A4/Test205A.pdf`
  visar den tidigare täta kontakten. Skattningslinjens läge och tjocklek,
  Rasch-skalan och uppgiftsmarkeringarnas koordinater är oförändrade.
- **B8, Förbättras:** programkrediteringen är nu exakt:
  `Dataprogram: Harald Janson 2026, med støtte fra Espen Janson og bruk av KI (ChatGPT fra OpenAI).`
  Första copyright-/referensraden är oförändrad.

## Verifiering

**Bevaras:** beräkningsformler, kalibrering, numeriska resultat, registrering,
filmodell, områdesval och tidigare regler för otillräckligt underlag.
Inga originalreferenser har ändrats.

- 335 automatiska tester passerar, inklusive Windows-beräkningar och
  filhantering. Nya tester täcker titelhantering och städning vid fel,
  upprepade utskriftsförsök, fältsymmetri, könsjustering, sidfot,
  decimaljustering och avgränsningsrader för urval respektive alla områden.
- 20 Edge-tester passerar: tio navigeringstester och tio rapporttester.
  De kontrollerar bland annat beräkningsstatus, oförändrad filstatus,
  titel vid utskriftsanrop, återställning via simulerat `afterprint` och
  Tillbaka, gråton och rubrikernas frigång vid 18:0.
- TypeScript och ESLint passerar.
- Sju PDF-filer exporterade från Edge i headless-läge omfattar en sida
  vardera. MediaBox är cirka 209,889 × 297,011 mm, samma Chromium-avrundning
  som tidigare. Rapportens koordinatsystem är fortfarande 210 × 297 mm
  med intern utskriftsyta x=20–190, y=20–277 mm. Modelltester hittar inga
  objekt utanför marginalerna. Skärm-/utskriftsgeometri testas inom 0,01 mm.
- Renderade PDF-sidor för 201 och 205 har inspekterats: header, numeriska
  kolumner, ljusare uppgifter och ny sidfot är läsbara, utan synlig klippning
  eller sidfotskollision. Windows 205A har också inspekterats för B7.

Första navigeringstestkörningen använde testets förvalda port 3000 medan
appen kördes på 3001. Den avbröts av anslutningsfel; samtliga tester
passerade efter omkörning med rätt `NUBU_TEST_URL`.

QA-filer ligger utanför Git-repot i visualiseringsarbetsytans `step-b/`.
Ingen fysisk skrivare har testats.

## Manuell kontroll i Edge – godkänd av projektägaren

Projektägaren har efter granskningen godkänt Steg B1–B8 i sin helhet.
Följande kontrollpunkter bevaras som granskningsunderlag; de tidigare
reservationerna om manuell granskning är därmed avslutade.

1. Öppna en registreringsfil, välj Skriv ut och Spara som PDF. Kontrollera
   exempelvis `Resultat Test201_100.pdf`. Prova även ett nytt fall utan
   filassociation: `Resultat.pdf`.
2. Kontrollera att fliktiteln återställs både efter sparande och efter
   avbrytning av utskriftsflödet. Prova även Tillbaka om titeln är kvar.
   Automatiska tester simulerar utskriftsanrop/händelser och verifierar
   vår kod, inte Edges verkliga spara-dialog eller dess händelsetidpunkt.
3. Bedöm `#cccccc` på skärm och i sparad PDF, gärna även fysisk utskrift.
4. Granska 205 med endast A valt: rubrikerna B/C ska ha luft ovanför den
   oförändrade skattningslinjen vid 18:0. Bedöm även övriga A–E-rubriker.
5. Bedöm datumavstånd, könsjustering och två långa anteckningar (401).

PDF-namnet är fortsatt ett avgränsat försök. Om Edges dialog inte använder
titeln eller återställer vid olämplig tidpunkt kan utskriftshjälpen tas bort
och knappen återgå till `window.print()` utan att påverka rapporten.

## Ändrade filer

- `src/app/page.tsx`, `src/app/registration.css`
- `src/components/ResultView.tsx`, `src/components/ReportPage.tsx`
- `src/report/graphics.ts`, nya `src/report/printing.ts`
- `src/api/skaring.ts` (endast rapporttextens blanksteg/radbrytning)
- `tests/report.test.cjs`, `tests/report.browser.cjs`, nya `tests/printing.test.cjs`
- Detta dokument.
