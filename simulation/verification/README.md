# Gemensam verifiering – körinstruktioner

Från projektroten:

```powershell
node simulation/verify-all.cjs
node --test tests/combinedVerification.test.cjs
```

Källorna är de fyra faktiska Win/Web-paren i main/exports och clinical/exports/clinical_windows.dat samt clinical_webb.txt. Först krävs exakt rätt ID-mängd i varje fil och totalt 1 250 utan överlapp. Den godkända compare.cjs används oförändrad. Sammanställaren skapar inga exportfiler och räknar inte om uppgiftsskårer.

report.md har separata avsnitt A (1 000), B (250) och C (1 250). pairs/ har fem fullständiga rapportuppsättningar. summary.json har källornas SHA-256, statistik separat för båda programmen och kolumnsammanställningar. deviations.tsv innehåller alla avvikelser med grupp, par och ID; endast rubrik betyder inga avvikelser. preserved-files.json skyddar tidigare material och alla manuella exporter.

Befintliga identiska resultat accepteras; avvikande tidigare rapporter skrivs inte över. Allt sker lokalt utan nätverk eller nya paket. Ingen produktionskod eller jämförelseregel ändras.
