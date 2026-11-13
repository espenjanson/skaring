# Fristående simulering – etapp 9A

Verktyget använder projektets befintliga TypeScript, Raschberäkning,
åldersfunktioner och `_100`-serialisering. Ingen programkod under `src/`
ändras. All körning sker lokalt i Node.js, utan nätverksanrop eller nya paket.

Från projektroten, för att återskapa slutleveransen:

```powershell
node simulation/run.cjs --sigma 0.85
node --test tests/simulation.test.cjs
```

`run.cjs` kompilerar `simulate.ts` i minnet med projektets befintliga
TypeScript-kompilator. Produktionsmoduler läses genom den befintliga
testhjälparen. Inga kompilerade filer sparas.

Utdata är `registreringer/S0001`–`S0200` utan ändelse, informationstabell
(UTF-8 med BOM och tabulatorer), rapport (bokmål) och SHA-256-kontrollsummor.
Registreringsmappen innehåller endast de 200 Windows-1252-filerna.
Använd denna undermapp vid senare dataexport.

Samma parametrar och oförändrade programmoduler ger identiska filbytes.
Befintliga identiska resultat accepteras; avvikande resultat skrivs aldrig
över. Använd en separat kopia av verktyget vid framtida experiment för att
bevara den granskade leveransen.

Slumpfrö: 20261113. Generator: Mulberry32, med 32-bitars heltalsoperationer
och tillståndssteget `0x6d2b79f5`. Varje person får ett eget tillstånd
`(20261113 + imul(personnummer, 0x9e3779b9)) >>> 0`, där personnummer är 1–200.
Normalvariabeln genereras med Box–Muller. Slumptal för alla uppgifter och
riktningsval reserveras oberoende av vilka uppgifter som sedan används.
Det gör att ändrad standardavvikelse använder samma grundläggande slumptal.

Slutvalet är σ_b = 0,85. Normalvariabeln Z omvandlas till
`b = 0.85 × [Z − 0.02(Z²−1) + 0.005(Z³−3Z)] / sqrt(1 + 2×0.02² + 6×0.005²)`.
Fördelningen har teoretiskt medelvärde 0 och standardavvikelse 0,85;
det faktiska urvalet centreras eller standardiseras inte. Valet gjordes
efter projektägarens komplettering och rättelse: referensens skevhet är
−0,28, toppigheten 3,60. Se rapporten för slutresultat och begränsningar.
Parametrarna finns i `FINAL_PARAMETERS` i `simulate.ts`.

**Bevaras:** ordinarie uppgiftsparametrar, beräkningar, åldersregler och
Windows-1252/CRLF-format med `NUBUMotor_100`.

**Förbättras:** inget ändras i skåringsprogrammet; experimentet är ett
separat verifieringsverktyg.

**Diskuteras:** ingen precis anpassning till referensgruppen görs.
Slutuppsättningen saknar percentil 0; medelvärde och standardavvikelse
är något högre än referensens. Detta redovisas öppet i rapporten.

**Verifieras:** faktisk öppning i Windows-programmet och den senare
jämförelsen mellan programmens dataexport ingår inte i denna etapp.

Genomförda slutkontroller:

- `node --test tests/*.test.cjs`: 371 tester passerar, inklusive 11
  simuleringstester och befintliga referensfall 302–304.
- `npx --no-install tsc --noEmit --incremental false`: passerar.
- `npm run lint` samt riktad ESLint av de tre nya kod-/testfilerna: passerar.
- Två körningar av leveranskommandot: identiska registreringsfiler,
  informationstabell, rapport och kontrollsummor.
- Filbytes på disk har jämförts med ny simulering och lästs av ordinarie
  parser. Alla 200 beräkningar lyckas; varje område har 2–5 poäng och varje
  barn 10–22 poäng i just detta urval.

Endast `simulation/` och `tests/simulation.test.cjs` har tillkommit.
Inga befintliga programfiler, referensfiler eller paket ändras.
Ingen Git-commit eller push har gjorts.
