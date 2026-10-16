# NUBU 4–16 – Nästa dokumenterade utvecklingssteg

**Status:** Reviderat planeringsutkast, 16 oktober 2026. Inga programkodändringar är godkända.

## Beslutad kursändring och utgångsläge
Referensen är **den distribuerade Windows-versionen från 2021** med separata fält `Navn`, `Merknad`, `Merknad 2`, `Født dato`, `Testdato` och `Alder`. Webbprogrammet ska **enbart läsa och skriva `NUBUMotor_100`**. Tidigare planer på `_100`–`_101`-konvertering och stöd för `_101` utgår. Det äldre programmet och dess rapport är visuell och funktionell referens.

Codex har tidigare inventerat ett separat React-gränssnitt och en stor TypeScript-klass med beräknings-, fil- och rapportkod; gränssnitt och beräkningsklass är ännu inte integrerade. Kända eller misstänkta kodproblem ska undersökas innan rättning. Inga ändringar görs utan godkännande.

## Fastställda principer
1. Alla testdata stannar lokalt i användarens webbläsare; inga testdata skickas till server eller externa tjänster.
2. Både online- och offlineanvändning är mål; distributionsmetoden bestäms senare.
3. 2021-programmets funktioner, beräkningar och rapportutseende är referens. Ändra inte formler eller kalibreringsvärden utan verifiering.
4. God kodkvalitet innebär läsbar struktur, tydliga typer och användbara kommentarer på amerikansk engelska.
5. Projektägaren granskar och godkänner varje programmeringssteg.
6. Separata text- och datumfält samt åldersberäkning ingår i **grundversion 1.0** och ska utformas innan gränssnittet byggs färdigt.
7. React behålls som utgångspunkt; SVG utvärderas för skalbar rapport och A4-utskrift.

## Förberedelser före programmering
**A. Rena styrdokument:** Slutför kravspecifikation v0.3 och dokumentation av Windows-programmet 2021. Acceptera eller avvisa spårade ändringar i kopior, ta bort motsägande äldre instruktioner, rätta versionsnummer/sidfot och märk frågor som ännu inte är beslutade. Ändra inte originalen utan projektägarens kontroll.

**B. Referenstestregister:** Inventera den nya ZIP-filen, dess Excel-lista, `_100`-filer, PDF-rapporter och skärmbilder. Koppla varje testnummer till indata och förväntade resultat. Prioritera datum- och åldersfallen **302, 303 och 304**, samt gränsfall för konfidensintervall, områdesval och Rasch. Skilj beräkningsvärden från layoutavvikelser och äldre Windows-utskriftsfel.

**C. Datakontrakt och filformat:** Specificera `Navn`, kön, födelsedatum, testdatum, manuellt/beräknat `Alder`, `Merknad`, `Merknad 2` och 50 uppgiftstecken. Definiera `_100`-formatets nio rader, Windows-kompatibel teckenkodning, CRLF, inläsning, sparande och round-trip-test. Definiera vad som ska hända vid ogiltiga datum, saknad ålder, otillåtna uppgiftstecken och osparade ändringar.

**D. Ålderskontrakt:** Verifiera mot 2021-programmet och gärna OpenScript-källkoden: datumformat, datumgränser, default för `Testdato`, växling mellan redigerbar och beräknad ålder, antal dagar mellan datum, konvertering till visat `Å:M`, samt exakt ålder för statistisk modell. När datumpar saknas används eventuell manuell `Å:M` med särskild halv-månadsregel. Avsaknad av ålder ska vara tillåten och kunna innebära att modellpercentil inte beräknas. Lås inte oklara valideringsgränser innan de godkänts.

**E. Kodgranskning av identifierade risker:** Undersök `9`-hantering, `substring`-semantik, områdesindex, extremvärdesflaggor och placeringen av variansnollställning i iterationsslingan. Identifiera och föreslå rättning; sök inte efter en förlorad Git-gren. Skilj verifierade fel från avsiktligt äldre beteende.

**F. Utvecklingsmiljö:** Kontrollera versionslåsta beroenden, Next.js/ESLint och avsedd pakethanterare så att samma Git-version kan byggas på båda datorerna. Ingen oombedd uppgradering eller radering av låsfiler.

## Föreslagen arbetsordning – kräver separat godkännande
1. Fastställ datakontrakt, `_100`-filformat och åldersregler med tester 302–304 som referens.
2. Skapa automatiserade tester för `_100`-inläsning/sparande, teckenkodning och datum-/åldersfunktioner, oberoende av gränssnittet.
3. Isolera och verifiera beräkningsfunktionerna mot referensfall; rätta identifierade fel ett i taget.
4. Koppla samman gemensam datamodell, React-formulär och beräkningslogik. Ersätt vid behov det rudimentära formuläret med 2021-versionens layout, efter särskilt godkännande.
5. Generera rapportens element med separata namn-, datum- och anmärkningsfält; jämför grafiskt mot 2021-rapporter och testa skalning/A4-utskrift, med SVG som första teknik att pröva.
6. Implementera lokalt filflöde, batch-export, områdesurval A–E och valbar Rasch-visning; verifiera varje del mot referensfall.
7. Slutför offlineleverans, webbläsarkompatibilitet och dokumentation.

Ordningen kan justeras efter resultaten av den skrivskyddade granskningen; särskilt fil- och datumhantering bör inte skjutas upp till slutet.

## Förslag till nästa avgränsade Codex-uppdrag – enbart undersökning
Granska utan filändringar hur den befintliga TypeScript-koden representerar och läser/skriver `NUBUMotor_100`, hanterar ålder och uppgiftstecken, och var stöd saknas för separata `Navn`, `Merknad`, `Merknad 2`, `Født dato` och `Testdato`. Redovisa en föreslagen datamodell, vilka funktioner som behöver skapas eller anpassas och en teststrategi för fall 302–304. Undersök dessutom `9`, `substring`, `gIsValidAE`, extremvärdesflaggor och variansnollställningen; föreslå men genomför inga rättningar. Ange filer, funktioner, verifierade fakta och öppna frågor. Om OpenScript-källkoden tillhandahålls, använd den som skrivskyddad referens för datumalgoritmerna.

## Beslut och frågor som återstår
- Exakta datumvalideringsgränser och hur ogiltiga datum presenteras för användaren.
- Vilka ålderskonverteringskonstanter och avrundningsregler i 2021-koden som ska bevaras exakt.
- Filåtkomst i olika webbläsare och offlinepaketering.
- Placering av områdes- och Rasch-kontroller, samt rapportvy kontra nytt fönster.
- När den stora TypeScript-klassen bör delas upp i moduler.
- Acceptanskriterier för numeriska resultat och rapportens visuella trohet.

## Ändringslogg
- **2026-10-16:** Ändrat mål till Windows 2021 och enbart `_100`; lagt till separata textfält, datum- och åldersregler, referensfall 302–304 och justerad arbetsordning. Inga kodändringar.
