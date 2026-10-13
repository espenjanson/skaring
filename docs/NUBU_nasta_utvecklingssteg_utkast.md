# NUBU 4–16 – Nästa dokumenterade utvecklingssteg

**Status:** Planeringsutkast, 13 oktober 2026. Inga kodändringar är godkända.

## Utgångsläge
Codex har inventerat projektet skrivskyddat. Det finns ett separat React-gränssnitt och en stor TypeScript-klass med beräknings-, fil- och rapportunderlag. Gränssnittet anropar ännu inte beräkningsklassen. Beräkningskoden innehåller flera misstänkta eller konstaterade översättningsfel. Ingen fungerande grafisk rapport finns.

## Fastställda principer
1. Testdata behandlas och beräknas lokalt i webbläsaren och skickas aldrig till server eller externa tjänster.
2. Online- och offlineanvändning ska möjliggöras; distributionsmetod väljs senare.
3. Windows-programmets resultat och utformning används som referens. Matematiska formler och kalibreringsvärden ändras inte utan verifiering.
4. God kodkvalitet betyder tydlig struktur och användbara kommentarer, inte största möjliga kommentarmängd.
5. Projektägaren granskar och godkänner ändringar, och kan testa resultat manuellt.
6. Åldersberäkning från födelse- och testdatum ska ingå i version 1.0.

## Föreslagna delsteg – före programmering
**A. Referenstestregister:** Samla fiktiva testfall med nummer, syfte, datafil, rapport och valda alternativ. Prioritera extremfall och konfidensintervall. Dokumentera skillnader mellan olika testfall.

**B. Datakontrakt:** Definiera en registrering med Notat, kön (gutt/jente/ej angivet), ålder, exakt 50 registrerade uppgiftstecken, områdesurval och rapportalternativ. Separera originaldata från beräkningsurval och beräkningsresultat. Bestäm validerings- och felregler.

**C. Kodgranskning av identifierade risker:** Kontrollera `9`-hanteringen i sitt sammanhang, `substring`-semantik, områdesindex, extremvärdesflaggor och variansens placering i iterationsslingan. Identifiera och föreslå hur felet med nollställningen av variansen i beräkningsalgoritmen kan åtgärdas. Skilj verifierade fel från avsiktliga funktioner.

**D. Utvecklingsmiljö:** Kontrollera Next.js/ESLint-versioner, vilken pakethanterare projektet avser, samt reproducerbar installation på båda datorerna. Ingen automatisk uppgradering eller radering av låsfiler.

## Föreslagen ordning – efter separat godkännande
1. Etablera referenstester och en minimal testbar beräkningsmodul.
2. Rätta och verifiera beräkningar i små, isolerade ändringar.
3. Implementera och testa `_100`/`_101`-filformat oberoende av grafiskt gränssnitt.
4. Skapa gemensam datamodell och minimal kedja från inmatning till beräkning.
5. Bygg eller ersätt huvudgränssnittet med Windows-programmet som förebild.
6. Implementera och jämför resultatrapportens grafik och A4-utskrift.
7. Färdigställ filåtkomst, export, åldersberäkning från datum och offlineleverans.

## Förslag till första avgränsade Codex-uppdrag
**Endast undersökning:** Redovisa exakt hur registrerade tecken, beräkningssträngar och områdesval används i `skaring.ts`; analysera särskilt alla tilldelningar av `9`, `substring` och `gIsValidAE`. Identifiera och föreslå hur felet med nollställningen av variansen i beräkningsalgoritmen kan åtgärdas. Föreslå ett tydligt datakontrakt och en minimal teststrategi. Ändra inga filer.

## Beslut som återstår
- Slutlig datamodell och åldersrepresentation.
- Metod för offlineleverans och kompatibla webbläsare.
- Val av grafikteknik efter en praktisk jämförelse med referensrapport.
- När och hur kodens stora klass delas upp i moduler.
- Konkreta acceptanskriterier och toleranser för beräkningsresultat och rapportlayout.
