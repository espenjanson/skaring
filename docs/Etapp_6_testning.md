# Etapp 6 – menyer och navigation

Utgångspunkt: `fc3532da82af697de1ffbe8731de7b34d3b28635`, godkänd etapp 5.
Arbetsgren: `codex/huvudbild-etapp-6`. Manuellt slutgranskad och godkänd av
projektägaren 2026-11-02, inklusive de sista visuella justeringarna av Arkiv
och Tilbake.

Beslutade justeringar efter manuell granskning, 2 november 2026: Arkiv visas
ramlöst med en liten nedåtriktad pil. Arkiv och meddelanden delar en permanent
rad utan avgränsningslinje mot rubriken. Raden har reserverad höjd per
skärmbredd; meddelanden bryts inom sin egen kolumn till höger om Arkiv.
Extra långa meddelanden kan rullas inom meddelandeområdet, som även kan nås
med tangentbord. Tilbake visas ramlöst med vänsterpil. Båda kontrollerna
behåller synlig tangentbordsfokus och sin befintliga funktion. Justeringarna
ingår i projektägarens slutliga godkännande 2026-11-02.

Sista visuella justeringen: Arkiv och Tilbake använder 15 px text och vikt
600 med samma ljusa, ramlösa hovermarkering. Tilbake har en dekorativ SVG-pil
med tydligare pilhuvud; kontrollens tillgängliga namn är Tilbake. Arkivs
befintliga nedåtpil behålls. Funktion, fokusmarkering och placering bevaras.

## Implementation och avgränsning

`Page` äger registreringens livslängd och anropar fortfarande samma
`useRegistrationFiles`. Ett separat React-tillstånd väljer huvudbild eller
resultatvy. Huvudbilden och dess filinput ligger kvar monterade och döljs med
HTML-attributet `hidden` under resultatvisning. Därmed behålls även
valideringsindikatorer, meddelanden och filväljarens händelsehantering.
Vybytet anropar ingen redigerings-, öppnings- eller nedladdningsoperation.

`ArchiveMenu` presenterar befintliga filfunktioner och samma `showResult` som
den nedre knappen. Filväljaren aktiveras fortfarande synkront från användarens
kommando. Fokus flyttas till resultatvyns rubrik och återställs till den
utlösande knappen vid återgång.

`ResultView` skiljer `result-controls` från `result-presentation`.
Återgångskontrollen döljs i utskriftsmedia som strukturell förberedelse;
rapport, utskriftsfunktion, beräkningsintegration, områdesval och Rasch-kontroll
implementeras först i etapp 7. Export är inaktiverad till etapp 8.

Uppgiftsram och knappar använder samma responsiva CSS-mått för högermarginal.
Den befintliga skillnaden på en CSS-pixel mellan redigeringsfältens och ramens
ytterkanter på bred skärm bevaras. Knappen Vis resultat följer ramen exakt.
Formulärets övriga mått ändras inte.

## Automatiska kontroller

Kör från projektroten med projektets befintliga beroenden:

```powershell
node --test tests/*.test.cjs
npx --no-install tsc --noEmit
npm run lint
```

Webbläsartesterna ligger separat i `tests/navigation.browser.cjs`. Starta
först `npm run dev -- --hostname 127.0.0.1`. Använd redan tillgänglig Playwright,
exempelvis den som ingår i Codex arbetsmiljö, utan att installera paket i projektet.
Sätt `NODE_PATH` till den befintliga paketkatalog som miljöns
`load_workspace_dependencies` anger, och kör sedan:

```powershell
node --test tests/navigation.browser.cjs
```

Testerna använder installerad Edge med en separat tillfällig profil. Annan
redan tillgänglig Chromium-kanal kan väljas med `NUBU_BROWSER_CHANNEL`.
`NUBU_TEST_URL` kan ange en annan lokal serveradress. Endast fiktiva referensdata
och lokala filer används; ingen fil laddas upp till servern.

Webbläsartesterna täcker menygrupper och ordning, inaktiverad export,
mus, tangentbord, fokus, befintliga filkommandon och dialoger, båda vägarna
till resultatvyn samt upprepade vybyten för nya, öppnade, nedladdade och
ändrade registreringar. De jämför alla inmatningsfält, status, fönsterlist,
meddelanden och valideringsindikatorer. Återställd redigering och föreslaget
nedladdningsnamn kontrollerar att referenskopia och filassociation består.
Filinputens DOM-identitet kontrolleras också. Knappjusteringen mäts vid
skärmbredderna 1000, 641, 600 och 400 CSS-pixlar.

De kompletterande layouttesterna kontrollerar de ramlösa kontrollernas
tangentbordsfokus samt oförändrat läge för rubrik och nedre knappgrupp när
meddelanden visas och stängs. Meny-/meddelanderaden kontrolleras utan
överlappning eller horisontellt överflöde vid 1000, 641, 600, 400 och 320
CSS-pixlar, både med nedladdningsmeddelande och filfel.

## Manuell granskning

- Kontrollera Arkiv-menyn, dess två skiljelinjer och grå exportkommando.
- Kontrollera ramlöst Arkiv med pil och ramlös ← Tilbake, med synlig
  tangentbordsfokus. Ladda ned och stäng meddelandet: rubriken ska ligga kvar
  på samma höjd. Prova även i ett smalt fönster; meddelandet ska ligga till
  höger om Arkiv utan överlappning och hela texten ska gå att läsa.
- Prova mus, Enter, blanksteg, pilar, Home, End, Escape, Tab och klick utanför.
- Kontrollera att knapparnas namn är oförändrade och att Vis resultat slutar
  vid uppgiftsramens högra kant även när fönstret görs smalare.
- Öppna en fiktiv referensfil, ändra flera fält och skårer, och växla flera gånger
  via både meny och knapp. Kontrollera återgång, innehåll, status och meddelanden.
- Ladda ned, växla igen, ändra och återställ ett fält. Kontrollera att status
  återgår och att nästa nedladdning fortfarande föreslår den öppnade filens namn.
- Prova Ny och Tøm formular med både avbrott och fortsatt åtgärd.
- Bekräfta att resultatvyn bara visar beslutad rubrik, återgång och platshållartext.

Verklig rapport, A4/PDF-utskrift, beräkningsresultat och områdes-/Rasch-val kan
inte acceptanstestas genom denna platshållare. De återstår till etapp 7.
