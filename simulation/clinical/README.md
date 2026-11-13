# Klinisk komplettering – körning och manuella exporter

Återskapa och kontrollera materialet från projektroten:

```powershell
node simulation/clinical-run.cjs
node --test tests/clinicalSimulation.test.cjs
```

Frö 20261115, 250 fall S1201–S1450. Parametrar för b är oförändrade. a är uniformt mellan −2,9158938248213855 och 0 (övre gränsen exkluderas), t = a + b − 1. Ingen fördelningsanpassning görs. Se report.md för exakt åldersmodell, statistik och begränsningar.

Registreringarna finns i registreringer/. generation.tsv är informationstabellen och summary.json innehåller fullständig statistik med grupperna åtskilda. Alla beräknade modellpercentiler, Rasch-estimat och extremflaggor är **preliminära simuleringsresultat**. De ersätter inte programmens faktiska exporter.

Inga befintliga avvikande filer skrivs över. Kontrollsummor för tidigare material kontrolleras före och efter leverans med previous-preservation.json. Vid upprepad körning jämförs alla nya leveransfiler byte för byte. De befintliga källfilerna läses utan ändringar. All behandling sker lokalt utan nätverksanrop eller nya paket.

## Två manuella exporter

1. Exportera endast de 250 registreringarna i simulation/clinical/registreringer med Windows-programmet. Spara som **simulation/clinical/exports/clinical_windows.dat**.
2. Exportera samma mapp med webbprogrammet. Spara som **simulation/clinical/exports/clinical_webb.txt**.

exports/ är en tom mottagningsmapp vid leverans. Inga exporter har skapats av generatorn. Lägg inte exporterna bland registreringarna. Filnamnen ovan är planerade namn; det är innehållet och dess ID som senare kontrolleras.

## Nästa etapp – först efter båda exporter och användarens godkännande

De åtta manuella huvudexporterna finns redan i simulation/main/exports och har endast kontrollsummerats för bevarande här:

| Grupp | Windows | Webb |
|---|---|---|
| S0201–S0450 | 261113 Win 01.dat | 261113 Web 01.dat |
| S0451–S0700 | 261113 Win 02.dat | 261113 Web 02.dat |
| S0701–S0950 | 261113 Win 03.dat | 261113 Web 03.dat |
| S0951–S1200 | 261113 Win 04.dat | 261113 Web 04.dat |
| S1201–S1450 | clinical/exports/clinical_windows.dat | clinical/exports/clinical_webb.txt |

Inga huvudexporter har namnändrats. Gruppkopplingen ovan är planerad utifrån filnamn och ska verifieras mot faktiska ID vid jämförelsen. Kör inte jämförelsen innan alla tio exporter finns och användaren har godkänt nästa steg.

Planerad slutrapport:

- **A – ordinarie 1 000:** faktiska exportfördelningar, percentiler, extremflaggor och överensstämmelse.
- **B – kliniska 250:** samma uppgifter, med särskilt fokus på låga percentiler och negativa differenser.
- **C – samtliga 1 250:** summerad programöverensstämmelse; inga blandade gruppfördelningar ska ersätta A och B.

Varje exportpar läses med det redan godkända compare.cjs och reglerna i ../COMPARISON.md. Oförändrad tolerans 0,0005 för LOGALDER/Rasch/standardfel, exakta övriga regler, 14/18-kolumnsmappning och separat sammansättningskontroll av anmärkningar. Varje avvikelse ska märkas med ID och grupp i den gemensamma redovisningen. Kontrollera exakt 250 ID per par och totalt S0201–S1450 utan överlapp eller luckor innan sammanställning. Pilotens 200 fall ingår inte i den nya totalsumman.

## Automatiska kontroller

```powershell
node --test tests/*.test.cjs
npx --no-install tsc --noEmit --incremental false
npm run lint
npx --no-install eslint simulation/clinical-simulate.ts simulation/clinical-run.cjs tests/clinicalSimulation.test.cjs
```

Ingen produktionskod, tidigare simulering eller jämförelseregel ändras. Ingen commit eller push ingår. Manuell öppning/export i programmen och deras jämförelse återstår.
