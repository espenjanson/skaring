# Steg C – uppgiftsmarkeringarnas koordinater

Implementerat 2026-11-11 på `codex/huvudbild-etapp-6`, efter `f4d55bc`.
Koordinatförslaget i `261111 Justering av uppgiftsfaelt.docx` är godkänt.
Steg C är manuellt granskat och godkänt av projektägaren, inklusive den
avslutande justeringen av A2 och A10. Samlad commit är godkänd; ingen push.

## Princip och avgränsning

**Förbättras:** uppgiftsobjekten använder befintliga `YPUFromMeasure` med skalans
gränser och halva objektshöjden avdragen. Överkanten avrundas till heltal innan
de nio godkända läsbarhetsjusteringarna läggs till. D1 begränsas till skalans
nedre gräns enligt befintlig transformation.

Normal vänsterkant är `avrunda(3108 + områdesindex * 1070.4)` med nollbaserat
områdesindex. De 17 beslutade sidoplaceringarna har offset −324/+324,
med den senare lokala korrigeringen till −184 för A2 och A10 (se nedan).
A5/A6 och C1/C2 är centrerade med algoritmiskt Y utan extra justering.

**Bevaras:** samtliga objektidentiteter, bredder (663) och höjder (192),
typsnitt, texter, poängmarkeringar, färger, skalor, skattningslinje och andra
rapportobjekt. Beräkningsformler, kalibrering och filhantering ändras inte.

Placeringen görs i `ReportGraphics.positionItems`, efter befintliga `setGraph`.
Sidolägen och vertikala undantag finns i två namngivna tabeller. Ursprungliga
objektdefinitioner i `skaring.ts` är oförändrade. Därmed kan tidigare layout
återfås genom att ta bort anropet till `positionItems`; ingen rekonstruering
av originalkoordinater behövs. Detta återställningssätt används också i testet
som jämför alla andra rapportobjekt och beräkningstillstånd före/efter.

## Koordinatjämförelse

Alla koordinater är ToolBook-enheter och avser objektets vänstra/övre kant.
`Y bas` är algoritmisk överkant efter heltalsavrundning, `Y tillägg` är det
godkända läsbarhetsundantaget. Högerkant = X + 663; nederkant = Y + 192.

| Uppgift | Rasch | Gammalt X | Gammalt Y | Nytt X | Y bas | Y tillägg | Nytt Y |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 | -1.94 | 3108 | 13105 | 3108 | 13105 | 0 | 13105 |
| A2 | -1.38 | 3108 | 12620 | 2924 | 12608 | 0 | 12608 |
| A3 | -1.22 | 3108 | 12454 | 3432 | 12466 | 0 | 12466 |
| A4 | -0.68 | 3108 | 11988 | 3108 | 11988 | 0 | 11988 |
| A5 | -0.15 | 3480 | 11602 | 3108 | 11518 | 0 | 11518 |
| A6 | -0.36 | 2880 | 11608 | 3108 | 11704 | 0 | 11704 |
| A7 | 0.43 | 3108 | 11004 | 3108 | 11004 | 0 | 11004 |
| A8 | 1.27 | 3108 | 10259 | 3108 | 10259 | 0 | 10259 |
| A9 | 2.24 | 3480 | 9483 | 3432 | 9399 | 0 | 9399 |
| A10 | 2.06 | 2880 | 9475 | 2924 | 9559 | 0 | 9559 |
| B1 | -2.76 | 4178 | 13831 | 4178 | 13831 | 0 | 13831 |
| B2 | -1.70 | 4178 | 12892 | 4178 | 12892 | 0 | 12892 |
| B3 | -1.02 | 4178 | 12289 | 4178 | 12289 | 0 | 12289 |
| B4 | -0.80 | 4178 | 12094 | 4178 | 12094 | 0 | 12094 |
| B5 | -0.29 | 4178 | 11642 | 4178 | 11642 | 0 | 11642 |
| B6 | 0.37 | 4178 | 11057 | 4178 | 11057 | 0 | 11057 |
| B7 | 1.05 | 4178 | 10454 | 4178 | 10454 | 0 | 10454 |
| B8 | 1.33 | 4178 | 10206 | 4178 | 10206 | 0 | 10206 |
| B9 | 1.61 | 4178 | 9958 | 4178 | 9958 | 0 | 9958 |
| B10 | 2.23 | 4178 | 9408 | 4178 | 9408 | 0 | 9408 |
| C1 | -2.54 | 5249 | 13636 | 5249 | 13636 | 0 | 13636 |
| C2 | -2.33 | 5249 | 13450 | 5249 | 13450 | 0 | 13450 |
| C3 | -1.72 | 5249 | 12934 | 4925 | 12910 | 0 | 12910 |
| C4 | -1.59 | 5249 | 12758 | 5573 | 12794 | 0 | 12794 |
| C5 | -1.35 | 5249 | 12570 | 5249 | 12582 | 0 | 12582 |
| C6 | -0.08 | 5585 | 11612 | 5249 | 11456 | 0 | 11456 |
| C7 | -0.37 | 4985 | 11617 | 5249 | 11713 | 0 | 11713 |
| C8 | 1.60 | 5249 | 10123 | 5249 | 9967 | -54 | 9913 |
| C9 | 1.49 | 5561 | 9956 | 5573 | 10064 | 54 | 10118 |
| C10 | 1.49 | 4937 | 9956 | 4925 | 10064 | 54 | 10118 |
| D1 | -2.82 | 6319 | 13881 | 6319 | 13881 | 0 | 13881 |
| D2 | -1.89 | 6319 | 13060 | 6319 | 13060 | 0 | 13060 |
| D3 | -0.83 | 6319 | 12121 | 6319 | 12121 | 0 | 12121 |
| D4 | -0.22 | 6307 | 11640 | 5995 | 11580 | 0 | 11580 |
| D5 | -0.26 | 5995 | 11459 | 6643 | 11615 | 40 | 11655 |
| D6 | -0.12 | 6643 | 11455 | 6643 | 11491 | -40 | 11451 |
| D7 | 1.31 | 6319 | 10224 | 6319 | 10224 | 0 | 10224 |
| D8 | 1.62 | 6319 | 9949 | 6319 | 9949 | 0 | 9949 |
| D9 | 1.93 | 6319 | 9674 | 6319 | 9674 | 0 | 9674 |
| D10 | 2.40 | 6319 | 9258 | 6319 | 9258 | 0 | 9258 |
| E1 | -1.54 | 7390 | 12774 | 7066 | 12750 | 0 | 12750 |
| E2 | -1.43 | 7390 | 12629 | 7714 | 12653 | 0 | 12653 |
| E3 | -1.04 | 7390 | 12307 | 7390 | 12307 | 0 | 12307 |
| E4 | 0.21 | 7390 | 11199 | 7390 | 11199 | 0 | 11199 |
| E5 | 0.89 | 7390 | 10596 | 7390 | 10596 | 0 | 10596 |
| E6 | 1.19 | 7738 | 10342 | 7714 | 10330 | 76 | 10406 |
| E7 | 1.25 | 7054 | 10349 | 7714 | 10277 | -76 | 10201 |
| E8 | 1.34 | 7054 | 10173 | 7066 | 10197 | -76 | 10121 |
| E9 | 1.19 | 7738 | 10174 | 7066 | 10330 | 76 | 10406 |
| E10 | 1.94 | 7390 | 9665 | 7390 | 9665 | 0 | 9665 |

## Verifiering

Automatiska modelltester jämför alla 50 nya koordinater mot en separat,
explicit tabell från beslutet. Ett annat test jämför föregående och ny rapport
för samtliga elva beräkningsreferensfall med alla områden respektive A-urval:
endast uppgiftskoordinater får skilja; beräkningstillstånd och övriga objekt
ska vara identiska.

Slutkontroller:

- 337 automatiska tester passerar, inklusive beräkningsreferenser och filhantering.
- 21 Edge-tester passerar (20 i den första körningen och det rättade nya
  kollisionsprovet vid omkörning). Det nya provet kör alla 31 verkliga
  områdesurval med Test402, i både skärm- och utskriftsläge, och kräver
  oförändrad objektgeometri mellan urvalen. Rasch-visning är på.
- TypeScript och ESLint passerar. `git diff --check` passerar.
- Åtta exporterade PDF-filer omfattar en A4-sida vardera. Den nya 402-PDF:en
  innehåller endast rapporten, utan kontroller. PDF-renderingar av 201 och
  402 har granskats visuellt. Ingen fysisk skrivare har testats.

Det första nya Edge-provet försökte ändra ett områdesval medan kontrollerna
var dolda av utskriftsläget och fick timeout. Testet återgår nu till skärmläge
före nästa urval. Det krävde ingen produktändring.

## Skillnader från analysens förutsägelser och kvarstående beslut

**Verifierat:** de godkända koordinaterna matchar exakt. Inga uppgiftstexter
överlappar andra uppgiftstexter vid något av de 31 urvalen, på skärm eller i
utskriftsläge. Minsta vertikala mellanrum mellan textrektanglar ligger inom
0,10–0,13 mm, i linje med analysens cirka 0,11 mm för A5/A6 och C1/C2.

**Historik, åtgärdat genom kompletteringen nedan:** analysens kollisionskontroll omfattade inte uppgiftstext mot
Rasch-skalans texter. Den kompletterande visuella och geometriska kontrollen
visar två kontakter när A-uppgifternas poäng visas och Rasch-skalan är på:

| Uppgift | Skaltext | Horisontell överlappning mellan textrektanglar |
|---|---|---:|
| A2 (2) | −1.5 (`measureprompt6`) | cirka 0,009 mm |
| A10 (2) | 2.0 (`measureprompt13`) | cirka 0,79 mm |

A10-kontakten är tydlig i 402-PDF:en. A2 ligger precis intill skaltexten;
rektangelöverlappning innebär inte nödvändigtvis överlappande bokstavsstreck.
Det nya Edge-testet identifierar båda kontakterna uttryckligen som kända
begränsningar, inte som ett godkännande av dem.

Efter denna första granskning godkände projektägaren layouten i övrigt och
beslutade att enbart A2/A10 skulle flyttas åt höger. Det gemensamma
sidoförskjutningsavståndet för övriga uppgifter behålls.

Den nya uppgiftsplaceringen avviker avsiktligt från Windows-programmets
manuellt justerade layout. Beräkningsresultat och övriga rapportobjekt är
oförändrade. Den manuella visuella granskningen är nu godkänd.

## Filer och granskningsunderlag

- `src/report/graphics.ts`: grundplacering, sidolägen och nio Y-undantag.
- `tests/report.test.cjs`: exakt 50-radersfacit och jämförelse med föregående rapport.
- `tests/report.browser.cjs`: samtliga urval, två medielägen och frigång till skaltexterna.
- `docs/Steg_C_uppgiftskoordinater.md`: detta dokument och jämförelsetabellen.

PDF-/bildfiler för granskning finns utanför Git-repot i visualiseringsarbetsytans
`step-c/`. Projektägarens Word-dokument och två PDF-referenser för Steg C
ingår i den godkända committen. Words tillfälliga låsfil lämnas utanför.

## Komplettering: lokal högerskjutning av A2 och A10

**Förbättras:** A2 och A10 flyttas båda 140 ToolBook-enheter åt höger,
vilket motsvarar 2,49084 mm med befintlig koordinatomräkning. Deras offset
från normal kolumnplacering ändras från −324 till −184. Dessa två lokala
undantag ger frigång till Rasch-skalans −1.5 och 2.0 utan att flytta skalan,
hela grafiken eller övriga uppgiftsmarkeringar. Ingen Y-position,
objektstorlek eller annan koordinat ändras jämfört med första Steg C.

| Uppgift | Föregående Steg C X1–X2 | Slutligt X1–X2 | Oförändrat Y1–Y2 |
|---|---|---|---|
| A2 | 2784–3447 | 2924–3587 | 12608–12800 |
| A10 | 2784–3447 | 2924–3587 | 9559–9751 |

Med Test402 och Rasch-visning kontrolleras alla 31 verkliga områdesurval,
både på skärm och i utskriftsläge. Inga textrektanglar för uppgifter
överlappar varandra eller Rasch-skalans texter. Minsta uppmätta horisontella
frigång över samtliga dessa lägen är:

| Mellan texter | Minsta frigång |
|---|---:|
| A2 och skalans −1.5 | 2,482 mm |
| A10 och skalans 2.0 | 1,697 mm |
| A2 och A3 | 1,353 mm |
| A10 och A9 | 0,568 mm |

A3 och A9 är de närmaste andra uppgiftsmarkeringarna i respektive höjdintervall.
Måtten gäller textrektanglar med befintligt typsnitt, inklusive poängtexten;
de är inte avstånd mellan de större transparenta objektrektanglarna.

Alla 337 automatiska tester och 21 Edge-tester passerar efter kompletteringen.
TypeScript, ESLint och diffkontroll passerar. Det explicita 50-radersfacit
ändras enbart för A2/A10:s X-koordinater; övriga 48 positioner är oförändrade.
Jämförelsen av övriga rapportobjekt, beräkningstillstånd och filhantering
passerar. Åtta nya PDF-kontrollfiler har exporterats i `step-c-a2-a10/`
utanför Git-repot. Den lokala korrigeringen är manuellt granskad och godkänd.
Ingen push ska göras av Codex; originalreferenserna lämnas orörda.
