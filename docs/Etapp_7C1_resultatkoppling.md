# Etapp 7C1 – koppling till React-resultatvyn

Utgångspunkt: `e4d198efa0228ef2e9fe5ac9e7acee6621d1a401`, gren
`codex/huvudbild-etapp-6`. Ingen commit eller push ingår.

## Gemensam beräkningsväg

**Förbättras:** `src/domain/results.ts` är den lilla typade adaptern mellan
`Registration`, `ResultSettings` och `ResultPresentation`. Den anropar den
verifierade `Skaring.calculateRegistration` med aktuella registreringsdata
och aktuellt urval. En ny beräkningsinstans används vid varje anrop.
Adaptern returnerar antingen ett giltigt presentationsresultat eller endast
ett felmeddelande med `canPrint: false`. Gamla beräkningsvärden kan därför
inte följa med efter ett misslyckat försök.

Båda Vis resultat-kommandona använder samma resultatvy som tidigare.
`Page` skickar aktuell registrering och separata inställningar till
`ResultView`; vyn anropar adaptern vid rendering. Ändrade områden eller
Rasch-val ger en ny rendering och samma beräkningsväg. Återöppning beräknar
från den då aktuella registreringen. Ingen separat resultatcache används.

**Bevaras:** 7A/7B:s formler, kalibreringar, datum-/åldersprincip och
precision. React räknar inga statistiska värden. Adaptern använder samma
etablerade intervalluttryck, `estimateToPresentText`, `modelPercentile` och
Rasch-/standardfelsformatering med två decimaler som den äldre rapporttexten.
Åldersberoende resultat kan vara ej beräkningsbara även när ett giltigt
Rasch-resultat finns. Extremfall behåller numeriskt Rasch-estimat men
presenterar inte standardfel eller konfidensintervall som tillgängliga.

## Tillfällig vy och meddelanden

Kontroller för A–E, Vis Rasch-skår och befintlig Tilbake ligger i ett grått
kontrollområde. Den separata vita ytan visar valda områden, poängantal,
poängsumma, visad ålder, åldersekvivalent, intervall, modellpercentil och
valbart Rasch/standardfel. Detta är en kontrollpresentation; den slutliga
Windows-layouten och dess grafik är inte implementerade.

Vid färre än tre giltiga uppgifter visas endast följande text i den vita
ytan, utan resultat, rubrik eller gamla värden:

> Resultat kan bare vises når minst tre oppgaver er gjennomført innenfor de valgte områdene.

Vid tomt urval visas endast:

> Velg minst ett område for å vise resultat.

Resultatvyn förblir öppen och kontrollerna aktiva. Ett nytt giltigt urval
visar resultat automatiskt. Ett annat beräkningsfel ger ett separat generellt
meddelande utan resultat. Minst tre uppgifter krävs sammanlagt, inte per
valt område; tomma områden kan ingå.

Huvudbildens kontroller och layout är bevarade. Den inaktuella meningen
om att resultatvisning kommer i nästa etapp är borttagen från hjälptexten.

## Beslutade inställningsregler

Projektägaren preciserade reglerna under arbetet och beslutade även om
Tøm formular. Inställningarna ligger i `Page`, separat från registrering,
referenskopia och filhanteringens status.

| Händelse | Områdesval | Vis Rasch-skår |
|---|---|---|
| Start av appsession | Alla A–E | Av |
| Tillbaka/Vis resultat | Behåll | Behåll |
| Redigering av registrering | Behåll | Behåll |
| Genomförd Ny | Alla A–E | Behåll |
| Framgångsrikt öppnad fil | Alla A–E | Behåll |
| Genomförd Tøm formular | Alla A–E | Behåll |
| Last ned | Behåll | Behåll |
| Avbruten eller misslyckad operation | Behåll | Behåll |

Session avser här den laddade appens livslängd. Ingen lokal lagring eller
lagring av resultatinställningar i registreringsfilen har införts.
Omladdning startar med standardinställningar.

`useRegistrationFiles` meddelar nu vilken redan accepterad händelse som
inträffat via sin befintliga callback. Filoperationer, dialoger, validering,
referenshantering och ändringsstatus är oförändrade. Områden återställs
först efter `new`, `opened` eller `cleared`, inte vid ett öppnat dialogfönster
eller vid avbrytande. `saved` återställer inte områden.

## Webbläsarberoende och lokal hantering

Klassens statiska Node-fs-import blockerade användning i klientpaketet.
Den är ersatt av ett valfritt, typat beroende för klassens äldre oanvända
filmetoder. Utan detta beroende returnerar dessa metoder 0 utan filåtkomst.
Resultatadaptern tillför inget sådant beroende och använder inga filmetoder.
Appens befintliga `_100`-filhantering är kvar och opåverkad. Inget nytt
`_101`-stöd har kopplats in eller utvecklats.

Alla registreringsdata och beräkningar stannar i webbläsarens minne.
Resultatkopplingen anropar inga servrar, externa API:er eller loggar.
Beräkningstesterna använder nu projektets gemensamma TypeScript-laddare,
som avvisar externa runtime-beroenden; fs-stubben behövs inte längre.

## Utskrift

Ingen ny utskriftsknapp eller fullständig utskriftsfunktion har byggts.
`canPrint` och `data-printable` förbereder för ett framtida kommando som
bara får aktiveras vid giltigt resultat. CSS för utskriftsmedia döljer
kontrollområdet. Vid ogiltigt resultat döljs hela resultatvyn, så att dess
meddelande inte kan skrivas ut som rapport via webbläsarens utskrift.
Slutlig A4-layout och Windows-rapportgrafik återstår.

## Verifiering och kvarstående frågor

- Alla befintliga format-, ålders-, beräknings- och filhanteringstester körs.
- 14 nya adaptertester återanvänder de elva referensfallen, kontrollerar
  värden/presentation, ej beräkningsbara värden, ogiltiga underlag,
  inställningsseparation och oförändrad registrering/filstatus.
- Adaptervärden i tvådecimalspresentation jämförs med exportens tre
  decimaler med högst 0,0055 avrundningsmarginal. 7A/7B:s underliggande
  toleranser 0,0005 (export) och 0,005 (PDF) kontrolleras fortsatt separat.
- Webbläsarsviten kontrollerar både resultatkommandona, giltigt/ogiltigt
  underlag, tomt urval, flera valda områden med tomma områden, Rasch av/på,
  återgång, aktuella registreringsändringar och att gamla resultat försvinner.
  Den kontrollerar också status, fokus, Ny/Åpne/Tøm, avbrytande,
  nedladdning och inställningarnas livslängd.
- Utskriftsmedia kontrolleras med både giltigt och ogiltigt resultat.
- Resultatvyn har visuellt granskats i lokala skärmbilder vid 641 och 320
  pixlars bredd, inklusive otillräckligt underlag. Inget horisontellt
  överspill påvisades i dessa tester.

De två kompatibilitetsfrågorna från 7B om exakt 18:0 och exakt halva
0,05-steg är kvar oförändrade. Ingen ytterligare funktionell beslutspunkt
har identifierats. Slutlig rapportlayout, slutligt utskriftskommando och
fullständig offline-distribution ligger utanför denna etapp.

## Filer och slutkontroller

Ändrade/tillagda filer i uppdraget:

- `src/domain/results.ts`
- `src/api/skaring.ts`
- `src/app/page.tsx`
- `src/app/useRegistrationFiles.ts`
- `src/app/registration.css`
- `src/components/ResultView.tsx`
- `tests/results.test.cjs`
- `tests/calculation.test.cjs`
- `tests/navigation.browser.cjs`
- `docs/Etapp_7C1_resultatkoppling.md`

Kontroller:

- `node --test tests/*.test.cjs`: 306 tester passerar.
- `node --test tests/navigation.browser.cjs`: alla 10 Edge-tester passerar.
- `npx --no-install tsc --noEmit --incremental false`: godkänd.
- `npm run lint`: inga varningar eller fel.
- `git diff --check`: godkänd.

Webbläsartesterna körs med befintlig Playwright från Codex runtime och Edge
mot en lokal Next-server på port 3001. Både server och webbläsare behövde
köras utanför sandlådan på grund av dess process-/nätverksbegränsningar;
initiala miljöfel i sandlådan var inte applikationsfel. Ett testantagande om
att oförändrad Tøm alltid visar dialog rättades till det befintliga beteendet;
filhanteringen ändrades inte för att passa testet. Inga paket installerades.
Originalreferenser och tidigare lokala dokumentändringar har inte ändrats.
