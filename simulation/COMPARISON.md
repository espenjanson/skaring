# Pilotjämförelse – körinstruktioner

Verktyget är fristående och använder endast lokal Node.js, projektets befintliga
TypeScript-kompilator och dess Windows-1252-avkodare. Inga paket installeras,
inga nätverksanrop görs och inga beräkningar körs om i skåringsprogrammet.

Kör från projektroten:

```powershell
node simulation/compare.cjs "simulation/261113 1128 Dataexport registreringer.dat" "simulation/261113 1135 webb Dataeksport.txt" --out simulation/pilot
```

Det skapar följande reproducerbara filer, utan klockslag eller absoluta sökvägar:

- `pilot-report.md`: rapport på bokmål, formatkontroll, ID-kontroll,
  sammanställning för alla 18 kolumner, numerisk riktning och gruppanalys.
- `pilot-deviations.tsv`: alla skillnader, även format och skillnader inom
  tolerans. UTF-8 med BOM, CRLF och korrekt TSV-citering. Endast rubrikrad
  betyder att inga avvikelser finns.
- `pilot-summary.json`: fullständig maskinläsbar sammanställning, ID-listor,
  filernas SHA-256, kodning, radslut, rubriker och avvikelser.

Inga indata skrivs. Befintliga identiska rapporter accepteras; ett befintligt
rapportnamn med annat innehåll avvisas. Välj ett nytt `--out`-prefix för ett
annat exportpar. Avsaknad av ID rapporteras; dubblerade ID och felaktiga filer
avvisas innan rapportskrivning. Rapportskrivningen är inte en transaktion mot
diskfel, men bägge indata och samtliga utdatakonflikter kontrolleras före skrivning.

Exitkoder: **0** = inga avvikelser utanför tolerans eller ensidiga dataluckor;
format och tolererade skillnader kan fortfarande finnas. **2** = innehållsavvikelse
utanför tolerans, ensidigt tomt värde eller ID som saknas i ena filen; rapporter
skapas. **1** = felaktig indata, felaktiga argument eller skrivfel.

För framtida exportpar används samma kommando med andra indata och unika
rapportprefix. Antalet poster är inte hårdkodat till 200 eller 250. Kör ett
exportpar i taget; inga nya registreringar genereras av detta verktyg.

## Format och matchning

Det stöder det dokumenterade Windows-schemat med 14 kolumner och webbens
schema med 18 kolumner, i fastställd ordning. Båda sidor kan ha något av
schemana. Ingen okänd rubrik gissas. `RASCHSKÅRE` är ett uttryckligt alias i
14-kolumnsschemat. Testerna kontrollerar 18-kolumnsschemat mot befintlig exportkod.

UTF-8-BOM avgör kodningen om den finns. Utan BOM används Windows-1252 för
första filen och UTF-8 för andra filen. Annan känd kodning kan anges uttryckligen:

```powershell
node simulation/compare.cjs windows.dat webb.txt --out simulation/annan --windows-encoding utf-8 --web-encoding windows-1252
```

Ovanstående visar alternativens syntax; pilotfilerna använder standardvärdena.
UTF-16/32, ogiltig UTF-8 och odefinierade Windows-1252-byte avvisas.
CRLF, LF och CR kan läsas, men avvikande radslut redovisas. Extra tomma
poster avvisas; tom sista kolumn bevaras. Citerade fält kan innehålla
tabulatorer, radbrytningar och dubblerade citattecken. Felaktig citering avvisas.

ID är exakt avkodat `FILNAVN`, oberoende av radposition. Filändelser,
skiftläge och mellanrum normaliseras inte. Tomma eller yttre blanksteg i ID
avvisas; initialerna i NAVN används aldrig som nyckel.

## Godkända jämförelseregler

| Kolumn | Regel |
|---|---|
| FILNAVN | Exakt text och ID-matchning |
| NAVN | Exakt text |
| KJØNN | Exakt kategorisk text, 0/1/9 |
| FØDSELSDATO | Exakt text när kolumnen finns på båda sidor |
| TESTDATO | Exakt text när kolumnen finns på båda sidor |
| VIST ALDER | Exakt text när kolumnen finns på båda sidor |
| LOGALDER | Exakt text samt absolut numerisk tolerans 0,0005 |
| MERKNAD | Exakt text när kolumnen finns på båda sidor |
| MERKNAD 2 | Exakt text när kolumnen finns på båda sidor |
| OPPGAVESKÅRER | Exakt text; inga tecken som `d` eller `9` byts ut |
| RASCHSKÅR | Exakt text samt absolut numerisk tolerans 0,0005 |
| STANDARDFEIL | Exakt text samt absolut numerisk tolerans 0,0005 |
| MINESTIMERT | Exakt kategorisk text, 0/1 |
| MAKSESTIMERT | Exakt kategorisk text, 0/1 |
| ALDERSEKVIVALENT | Exakt text, inklusive gränsuttryck |
| NEDRE GRENSE KONF.INT. | Exakt text, inklusive gränsuttryck |
| ØVRE GRENSE KONF.INT. | Exakt text, inklusive gränsuttryck |
| MODELLBASERT PERSENTIL | Exakt text samt numerisk tolerans 0 |

Rasch och standardfel följer [Etapp 7A](../docs/Etapp_7A_berakningsverifiering.md).
LOGALDER och kolumnmappningen är uttryckligen godkända i pilotuppdraget.
Toleransen 0,0005 är inklusive gränsen och kontrolleras med heltalsaritmetik
i decimalbas. Ingen generell flyttalsepsilon läggs till. Två tredecimaliga
exportvärden som skiljer 0,001 hamnar därför utanför toleransen; deras
underliggande oavrundade värden kan inte avgöras från exporterna.

Ingen trimning, Unicode-normalisering, omräkning av Å:M eller ändring av
datainnehåll görs. Nödvändig avkodning av strukturell TSV-citering är tillåten.
Olika numerisk text med samma talvärde visas som formateringsskillnad.
Ensidigt tomma celler redovisas separat; två tomma celler är exakt lika
men är inte numeriska nollor. Okänd numerisk syntax avvisas.

När ena sidan har 14 kolumner saknar fem webbkolumner individuell
motsvarighet: de tre datum-/ålderskolumnerna samt de två anmärkningarna.
De markeras som **ej jämförbara**, inte som matchande tomma fält.
En separat kontroll jämför `MERKNADER` med `MERKNAD + " " + MERKNAD 2`.
Den kontrollen kan inte verifiera gränsen mellan de två textfälten.

## Analys och begränsningar

För varje kolumn redovisas exakt likhet, numerisk formatering, skillnader
inom/utanför tolerans, ensidigt tomma celler, båda tomma och saknad kolumn.
För numeriska par redovisas största absoluta skillnad, antal positiva och
negativa skillnader samt medelskillnaden. Riktningen är alltid **webb − Windows**.

Gruppanalysen undersöker visad ålder, Rasch, standardfel, min-/maxflaggor och
antal giltiga 0/1/2-uppgifter. Den är deskriptiv och påstår inte orsakssamband.
Inga korrelationer beräknas när det saknas avvikelser. SHA-256 identifierar
indata; testerna verifierar dessutom de 200 godkända registreringsfilerna.

**Bevaras:** pilotregistreringar, manuella exporter och all produktionskod.
**Förbättras:** ett separat återanvändbart granskningsverktyg.
**Verifieras:** exporternas faktiska innehåll vid redovisad precision.
**Diskuteras:** godkännande av piloten innan nästa etapp. De 1 000 nya fallen
ingår inte och har inte genererats.

## Tester

```powershell
node --test tests/comparison.test.cjs
node --test tests/*.test.cjs
npx --no-install tsc --noEmit --incremental false
npm run lint
npx --no-install eslint simulation/compare.ts simulation/compare.cjs tests/comparison.test.cjs
git diff --check
```

Testerna omfattar omkastad radordning, saknade/dubblerade ID, båda schemana,
citerade TSV-fält, felaktiga filer och kodningar, exakta toleransgränser i
båda riktningarna, kategoriska värden, tomma celler, oförändrade
uppgiftstecken, pilotens kontrollsummor och reproducerbar CLI-körning.

Slutkontroll för piloten: **385 automatiska tester passerar**, varav 14 gäller
jämförelseverktyget. TypeScript, projektets lint och riktad ESLint passerar.
Kontrollsummorna för båda manuella exporter och de 200 registreringsfilerna
är oförändrade. Pilotrapporterna jämförs byte för byte med en ny beräkning
i testerna; upprepad körning accepterar identiska rapporter.
Ingen webbläsartestning behövdes för detta fristående kommandoradsverktyg.
Inga produktionsfiler eller paket ändrades och ingen commit eller push gjordes.
