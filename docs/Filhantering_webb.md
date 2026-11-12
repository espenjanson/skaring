# Filhantering i webbprogrammet

Detta dokument kompletterar Filhantering v05 och dokumenterar den beslutade
kompatibilitetsbegränsningen för filnamn. Registreringsformatet är fortsatt
NUBUMotor_100, Windows-1252 utan BOM och med CRLF. Inget filformat ändras.

## Filnamnsförslag och webbläsarens slutliga namn

**Bevaras:** programmet överlämnar filnamnet från nedladdningsdialogen oförändrat
till HTML-länkens `download`-egenskap. Blob, objekt-URL, vanlig nedladdning och
URL-städning behålls. Programmet bekräftar endast nedladdningsstart.

**Verifierat:** Chromium-baserade webbläsare på Windows kan ändra korta namn
som liknar 8.3-formatet, exempelvis `Test403.~Z4` till `Test403._Z4`.
Den separata undersökningen visade att rätt namn fanns i länken innan
webbläsarens behandling. Filinnehållet förändras inte av namnändringen.
Chromiums källkod beskriver en säkerhetsregel kopplad till Windows/VFAT-kortnamn:
[Chromiums filnamnsbehandling](https://raw.githubusercontent.com/chromium/chromium/main/base/i18n/file_util_icu.cc).

**Beslutat:** ingen omskrivning av filnamnet, ändring av nedladdningsmekanismen
eller särskild varning till användaren införs. Det slutliga namnet är under
webbläsarens kontroll. Längre namn har i den separata undersökningen kunnat
behålla tilde; detta är ingen garanti för alla versioner eller plattformar.

## Öppning avgörs av innehållet

**Bevaras:** Arkiv → Åpne har inget `accept`-filter och kräver ingen viss
filändelse. Filens byteinnehåll läses lokalt och valideras av befintlig parser.
En fil med namnet `Test403._Z4`, `.txt` eller utan ändelse kan därför vara en
korrekt registreringsfil. Omvänt gör ändelsen `.~Z4` inte ogiltigt innehåll giltigt.

Läs-/strukturfel ger `Kunne ikke åpne filen.`. Strukturellt läsbart innehåll med
okänd identifierare hanteras av Åpnes befintliga formatdialog. Dataexport använder
samma åtskillnad men avbryter hela körningen vid okänd identifierare.

## Verifiering och begränsningar

Automatiska kontroller skiljer på namnet som programmet lämnar över och det som
webbläsaren väljer. Webbläsartestet laddar ned Test403, kontrollerar länknamnet,
återöppnar den faktiskt nedladdade filen med `._Z4` och jämför formulärfälten.
Samma innehåll öppnas även utan filändelse. Testet använder separata testprofiler
och fiktiva referensdata; användarens vanliga webbläsarprofil ändras inte.

Verkliga operativsystemdialoger, användarspecifika säkerhetsinställningar och
andra webbläsarversioner behöver fortsatt manuell kontroll. Körmiljöer och
resultat för denna komplettering redovisas i [Etapp 8](Etapp_8_dataexport.md).

**Verifierat i kompletteringen:** Edge 157.0.4341.46 och Norton Secure Browser
154.0.35683.100 på Windows överlämnas båda `Test403.~Z4` och väljer därefter
`Test403._Z4`. Återöppning av den faktiskt nedladdade filen och öppning utan
ändelse passerar i båda. Fyra automatiska filhanteringstester omfattar även
`.txt`. Begränsningen gäller webbläsarens val av slutligt nedladdningsnamn;
programmets innehållsbaserade öppning kräver ingen ändelse.
