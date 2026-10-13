# Arbetsinstruktioner för Codex – NUBU 4–16

## Projektets mål och beslutanderätt
- Webbprogrammet ska funktionellt motsvara Windows-versionen av NUBU 4–16. Inmatningsbilden ska vara välbekant; resultatrapporten ska återskapas med mycket hög visuell trohet.
- Projektägaren beslutar om funktionella förändringar och godkänner varje programmeringsetapp.
- Kravspecifikationen i `docs/` och referensfall från Windows-programmet är styrande. Om kod och krav motsäger varandra: redovisa motsägelsen, ändra inte beteendet på eget initiativ.
- Kategorisera krav som **Bevaras**, **Förbättras**, **Diskuteras** eller **Verifieras**.

## Integritet och exekvering
- Testdata (inmatade och öppnade datafiler) får inte skickas till webbserver, externa API:er, telemetri, analysverktyg eller felrapportering.
- Beräkningar, validering och resultatgenerering ska utföras lokalt i användarens webbläsare.
- Utforma programmet för möjlig online- och offlineanvändning. Distributionssätt är ännu inte beslutat.
- Undvik att logga testdata till konsol eller andra loggar i färdig funktionalitet.

## Kodkvalitet och arkitektur
- Skriv tydlig, konsekvent och manuellt underhållbar TypeScript-kod. Ingen framtida utveckling får förutsätta AI.
- Använd beskrivande namn och tydliga typer. Undvik onödiga förkortningar, dolda beroenden och magiska värden.
- Skriv relevanta kommentarer som förklarar **varför**, antaganden, särskilda beräkningsregler, filformat och avvikelser från intuitivt beteende. Dokumentera modulansvar och viktiga publika funktioner, gärna med JSDoc. Undvik kommentarer som bara upprepar koden.
- Följ projektets formateringsregler med Prettier och använd ESLint när verktygskonfigurationen fungerar.
- Eftersträva separation mellan datamodell, beräkning, kalibreringsdata, filformat, filåtkomst, rapport och användargränssnitt. Större omstrukturering kräver separat godkännande.
- Bevara originalets statistiska formler, kalibreringsvärden och rapportregler tills de verifierats mot referenser. Gör inga tysta matematiska ändringar.
- Skilj registrerade uppgiftstecken från poäng som används i beräkningen. Endast 0, 1 och 2 är giltiga poäng; andra tecken ska kunna bevaras enligt kravspecifikationen.

## Arbetsprocess och Git
- Arbeta i små, avgränsade, granskningsbara steg. Presentera plan och berörda filer innan större ändringar.
- Gör inga oombedda filändringar, paketinstallationer, beroendeuppgraderingar, Git-commits, push eller raderingar.
- Föreslå separat Git-gren vid större förändringar, men skapa den först efter godkännande.
- För varje uppgift: ange ändrade filer, motivering, eventuella risker, körda tester och tester som återstår. Skilj mellan verifierade fakta och bedömningar.
- Testa beräkningslogik och filformat mot dokumenterade referensfall innan funktionaliteten bedöms som färdig.
- När något är oklart eller motstridigt, fråga projektägaren i stället för att gissa.

## Språk och dokumentation
- Förklara tekniska beslut och arbetsresultat på begriplig svenska. Programgränssnittets språk ska vara norska (bokmål).
- Underhåll projektets README och tekniska dokumentation när detta ingår i en godkänd uppgift.
- Kommentarer i programkoden (skaring.ts) ska vara på amerikansk engelska (English US). 

## Aktuell status
- En skrivskyddad kodinventering är genomförd. Ingen kodändring är ännu godkänd.
- Befintligt gränssnitt kan komma att ersättas, men detta ska beslutas efter arkitektur- och datamodellsgranskning.
- Föreslagen teknik för rapportgrafik är SVG, ännu inte fastställd.
- Ny åldersberäkning från födelse- och testdatum ska ingå i version 1.0, efter att grundfunktionerna fungerar.
