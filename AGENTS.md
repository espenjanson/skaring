# Arbetsinstruktioner för Codex – NUBU 4–16

## Projektets mål och beslutanderätt
- **Referensversionen är det distribuerade Windows-programmet från 2021**, inte den senare experimentella versionen. Huvudbilden ska vara välbekant och resultatrapporten återskapas med mycket hög visuell trohet.
- **Version 1.0 ska läsa och skriva enbart filformatet `NUBUMotor_100`.** Implementera inte `_101`-konvertering eller `_101`-sparande utan ett nytt uttryckligt beslut.
- Projektägaren beslutar om funktionella förändringar och godkänner varje programmeringsetapp.
- Kravspecifikationen i `docs/`, dokumentationen av Windows-versionen 2021 och referensfallen är styrande. Om de motsäger varandra eller den befintliga koden: redovisa motsägelsen och fråga, ändra inte på eget initiativ.
- Kategorisera krav som **Bevaras**, **Förbättras**, **Diskuteras** eller **Verifieras**.

## Integritet och exekvering
- Inmatade och inlästa testdata får aldrig skickas till webbserver, externa API:er, telemetri, analysverktyg eller felrapportering.
- Filhantering, validering, beräkningar och rapportgenerering ska ske lokalt i användarens webbläsare.
- Utforma för både online- och offlineanvändning; distributionsmetod är ännu inte beslutad.
- Undvik att logga person- eller testdata till konsol eller andra loggar i färdig funktionalitet.

## Datamodell, datum och filformat
- Registreringen ska ha **separata** fält för `Navn`, `Merknad`, `Merknad 2`, `Født dato`, `Testdato`, kön, ålder och exakt 50 uppgiftstecken. Slå inte samman de tre textfälten.
- `_100` är ett radbaserat filformat med nio rader. Mappningen ska verifieras mot originalfilerna: rad 1 namn, 2 kön, 3 födelsedatum, 4 testdatum, 5 visad ålder (`Å:M`), 6–7 de två anmärkningarna, 8 de 50 uppgiftstecknen och 9 `NUBUMotor_100`. Bevara kompatibel teckenkodning och radslut.
- Datum anges som `DD.MM.ÅÅÅÅ` oberoende av datorns datumformat. Båda kan vara tomma; `Testdato` får dagens datum som förval vid ny registrering men användaren kan radera det. Exakta regler för datumvalidering ska verifieras och godkännas.
- När båda datumen är giltiga beräknas åldern från datumskillnaden: visa `Å:M` som icke redigerbart fält men använd **exakt beräkningsålder** i statistiska beräkningar. När giltigt datumpar saknas får åldern anges manuellt i `Å:M` eller lämnas tom. För manuell ålder används den särskilda omräkningsregeln i 2021-programmet; verifiera den före implementation. Blanda inte ihop visad och statistiskt använd ålder.
- Skilj registrerade uppgiftstecken från poäng som används i beräkningen. Endast `0`, `1` och `2` är giltiga poäng; övriga tecken ska hanteras och i förekommande fall bevaras enligt kravspecifikationen. Tomt fält serialiseras som `*`.
- Håll originaldata, tillfälligt områdesurval och beräkningsresultat åtskilda. Områdesurval får inte förstöra registrerade poäng.

## Kodkvalitet och arkitektur
- Skriv tydlig, konsekvent, typad och manuellt underhållbar TypeScript-kod; framtida underhåll får inte förutsätta AI.
- Använd beskrivande namn; undvik dolda beroenden och magiska värden.
- Skriv relevanta kommentarer om **varför**, antaganden, särskilda algoritmer och filformat; undvik att upprepa självklara kodrader. Dokumentera modulansvar och viktiga publika funktioner.
- **Kommentarer i all programkod ska vara på amerikansk engelska (en-US)**, även i andra filer än `skaring.ts`.
- Följ Prettier och använd ESLint när projektets konfiguration fungerar. Uppgradera inte verktyg utan godkännande.
- Eftersträva separation mellan datamodell, ålders- och datumlogik, statistiska beräkningar, kalibreringsdata, filformat, lokal filåtkomst, rapport och React-gränssnitt. Större omstrukturering kräver separat godkännande.
- Bevara statistiska formler, kalibreringsvärden och rapportregler tills de verifierats mot 2021-programmet och referenstesterna.
- React behålls som utgångspunkt för gränssnittet. SVG är förstahandsalternativ att **utvärdera** för rapportgrafik, inte ett slutligt teknikbeslut. Rapporten ska behålla proportioner vid skalning och skrivas ut som A4.

## Arbetsprocess och Git
- Arbeta i små, avgränsade, granskningsbara steg. Presentera plan och berörda filer innan ändringar.
- Gör inga oombedda filändringar, paketinstallationer, uppgraderingar, Git-commits, push eller raderingar.
- Föreslå separat Git-gren vid större förändringar, men skapa den först efter godkännande.
- Redovisa ändrade filer, motivering, risker, körda tester och återstående tester. Skilj verifierade fakta från antaganden.
- Testa filformat, åldersregler och beräkningar mot dokumenterade fiktiva referensfall, särskilt datumfallen 302–304.
- När något är oklart eller motstridigt, fråga projektägaren i stället för att gissa.

## Språk och dokumentation
- Förklara tekniska beslut och arbetsresultat på begriplig svenska. Användargränssnitt och rapport ska vara på norska (bokmål).
- Underhåll README och teknisk dokumentation när detta ingår i ett godkänt uppdrag.
- Äldre OpenScript/ToolBook-källkod får användas som **skrivskyddad referens** efter projektägarens beslut; den är inte automatiskt en specifikation av grafiska objekt.

## Aktuell status
- Skrivskyddad kodinventering är genomförd; ingen programmeringsändring är godkänd.
- Kursändring beslutad 16 oktober 2026: referens är Windows-version 2021 och `_100` är enda målformatet.
- Befintligt React-gränssnitt granskas före eventuellt byte. Rapportgrafik och online/offline-distribution återstår att utforma.
- Datumfält, separata textfält och korrekt åldershantering ska finnas **från början i version 1.0**, inte läggas till som en sen efterhandsändring.
