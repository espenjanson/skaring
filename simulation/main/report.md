# Hovedsimulering – 1 000 registreringer

## Status og metode

1 000 nye syntetiske registreringer, S0201–S1200, i fire mapper med 250 filer hver. Fast frø: 20261114; pilotfrø: 20261113. Dette er generering og lokal kontroll, ikke en sammenligning mellom Windows- og webbprogrammet. Ingen Windows- eller webbeksporter er opprettet. Ingen kliniske tilleggsfall er generert.

Pilotens godkjente metode og parametere beholdes: Mulberry32, separate personstrømmer, Box–Muller, sigma_b = 0,85, c = −0,02 og k = 0,005. For Z fra standard normalfordeling:

b = 0,85 × [Z − 0,02(Z²−1) + 0,005(Z³−3Z)] / sqrt(1 + 2×0,02² + 6×0,005²).

t = a + b, uten ekstra forskyvning. a er uniform mellom -2.9158938248213855 og 3.7313848736069484, som i piloten. Beredskapen til å endre spredning brukes ikke her: frøet og fordelingen er fastlagt før genereringen, og ingen barn erstattes eller håndplukkes.

Visningsalder fås med exp(1,968 + 0,254a) og pilotens trunkering til Å:M. Fødselsdato og testdato er tomme. Den registrerte manuelle alderen brukes med programmets halvmånedstillegg når det aldersforventede Rasch-verdiet beregnes. Teoretisk funksjonsnivå t, registrert alder og beregnet Rasch-estimat holdes atskilt.

Alle oppgaver starter som 9. Pilotens adaptive utvalg og stoppregler brukes uendret, med 2–5 skårede oppgaver per område. Tre kategoriers vekter er 1, exp(t−g+0,39), exp(2(t−g)). Navn, merknader og kjønn trekkes med samme regler og sannsynligheter som i piloten (50/48/2 prosent).

## Beskrivende sammenligning med piloten

Tallene er observasjoner i syntetiske utvalg, ikke en ny normtilpasning. SD bruker n−1. Skjevhet og kurtose bruker sentrale momenter med n i nevneren; normal kurtose er 3.

| Variabel | Hoved: gj.snitt | SD | Min–maks | Pilot: gj.snitt | SD | Min–maks |
|---|---:|---:|---|---:|---:|---|
| Registrert alder, måneder | 107,198 | 51,002 | 41,000–221,000 | 109,780 | 48,877 | 41,000–221,000 |
| a | 0,435 | 1,923 | -2,907–3,730 | 0,587 | 1,802 | -2,888–3,723 |
| b | 0,029 | 0,836 | -3,170–2,312 | 0,036 | 0,760 | -2,374–1,689 |
| t | 0,464 | 2,116 | -5,724–5,180 | 0,623 | 1,898 | -4,432–3,939 |
| t − aldersforventet Rasch | 0,029 | 0,836 | -3,163–2,311 | 0,037 | 0,759 | -2,341–1,692 |
| Rasch-estimat | 0,484 | 2,243 | -6,061–5,834 | 0,663 | 1,996 | -6,061–4,619 |
| Estimat − aldersforventet Rasch | 0,048 | 0,999 | -3,560–3,323 | 0,077 | 0,888 | -3,970–2,138 |
| Avrundet differanse (0,05) | 0,048 | 0,999 | -3,550–3,300 | 0,078 | 0,888 | -3,950–2,150 |
| Standardfeil | 0,456 | 0,239 | 0,295–1,830 | 0,426 | 0,159 | 0,304–1,830 |
| Antall skårede oppgaver | 14,322 | 3,320 | 10,000–24,000 | 14,525 | 3,335 | 10,000–22,000 |

Skjevhet/kurtose for estimert differanse: hoved -0,046/3,266, pilot -0,327/4,010. Variasjon mellom disse utvalgene forventes; ingen justering er gjort for å oppnå en bestemt normfordeling.

| Gruppe | Hoved (n = 1 000) | Pilot (n = 200) |
|---|---:|---:|
| Gutt | 497 (49,700 %) | 84 (42,000 %) |
| Jente | 480 (48,000 %) | 108 (54,000 %) |
| Udefinert kjønn | 23 (2,300 %) | 8 (4,000 %) |
| Modellpersentil 0 | 0 (0,000 %) | 0 (0,000 %) |
| Modellpersentil 30–70 | 292 (29,200 %) | 52 (26,000 %) |
| Modellpersentil 100 | 26 (2,600 %) | 1 (0,500 %) |

Min-/maksestimerte tilfeller: hoved 3/17, pilot 1/0. Slike tilfeller beholdes. Eventuelle tomme konfidensgrenser i senere eksport skal behandles med de godkjente sammenligningsreglene.

### Alder og antall oppgaver

| Hele år i registrert alder | Hoved | Pilot |
|---|---:|---:|
| 3 | 97 | 9 |
| 4 | 117 | 25 |
| 5 | 113 | 25 |
| 6 | 84 | 24 |
| 7 | 87 | 12 |
| 8 | 69 | 13 |
| 9 | 66 | 13 |
| 10 | 56 | 11 |
| 11 | 51 | 9 |
| 12 | 42 | 16 |
| 13 | 47 | 11 |
| 14 | 48 | 9 |
| 15 | 46 | 8 |
| 16 | 33 | 9 |
| 17 | 21 | 3 |
| 18 | 23 | 3 |

| Skårede oppgaver per barn | Hoved | Pilot |
|---|---:|---:|
| 10 | 172 | 36 |
| 11 | 112 | 16 |
| 12 | 73 | 10 |
| 13 | 79 | 18 |
| 14 | 93 | 20 |
| 15 | 107 | 16 |
| 16 | 75 | 28 |
| 17 | 85 | 17 |
| 18 | 80 | 9 |
| 19 | 47 | 15 |
| 20 | 50 | 8 |
| 21 | 16 | 3 |
| 22 | 8 | 4 |
| 23 | 2 | 0 |
| 24 | 1 | 0 |

| Område | 2 oppgaver | 3 oppgaver | 4 oppgaver | 5 oppgaver |
|---|---:|---:|---:|---:|
| A | 516 | 207 | 144 | 133 |
| B | 508 | 240 | 134 | 118 |
| C | 523 | 207 | 160 | 110 |
| D | 498 | 235 | 143 | 124 |
| E | 539 | 224 | 119 | 118 |

Samtlige 50 000 oppgavetegn i hovedmaterialet: 0 = 4227, 1 = 4997, 2 = 5098, 9 = 35678. Fullstendige fordelinger, inkludert hver modellpersentil, finnes i summary.json.

## Filer og automatiske kontroller

- 01_S0201-S0450/: 250 filer uten filendelse.
- 02_S0451-S0700/: 250 filer uten filendelse.
- 03_S0701-S0950/: 250 filer uten filendelse.
- 04_S0951-S1200/: 250 filer uten filendelse.

Filene er ordinære NUBUMotor_100, Windows-1252 uten BOM med CRLF, produsert med uendret serializer og lest tilbake med ordinær parser. Kjønn er de faktiske boolske kombinasjonene. Beregningen lykkes for alle 1 000 med ordinær modell. Alle har 50 tegn fra 0/1/2/9, 2–5 gyldige skårer per område og 10–25 totalt. Ingen oppgave velges to ganger innen et område.

Den nye adapteren gir byte-identisk pilotmateriale med pilotinnstillingene, men skriver aldri til piloten. Hovedmaterialet er generert to ganger og sammenlignet inklusive alle felter og filbytes. De 1 000 nye ID-ene er unike, og ingen registreringsfil har samme bytes som en pilotfil eller en annen hovedfil. Personstrømmenes starttilstander overlapper ikke med pilotens.

generation.tsv inneholder ID, mappe, a, b, t, registrert og statistisk alder, aldersforventet Rasch, estimat, latent og estimert differanse, persentil, skårer, standardfeil, ekstremflagg, antall og utvalgsrekkefølge. Dette er simuleringsinformasjon, ikke en programdataeksport. SHA256SUMS.txt beskytter de 1 000 registreringene. pilot-preservation.json dokumenterer kontrollsummene til de uendrede pilotfilene og sammenligningsverktøyet.

## Neste steg: manuelle eksporter

Se README.md for de åtte planlagte eksportnavnene og de fire sammenligningskommandoene. Eksporter én registreringsmappe om gangen med begge programmene. Lagre eksportene i exports/, utenfor registreringsmappene. Ikke legg rapporter eller andre filer blant de 250 registreringene.

Sammenligningen gjennomføres først når ekte manuelle eksporter finnes. Uendret compare.cjs brukes med de godkjente reglene: 13 felles kolonner, egen sammensetningskontroll for merknader, fem individuelt ikke-sammenlignbare webbkolonner mot 14-kolonners Windows-format; toleranse 0,0005 for LOGALDER, Rasch og standardfeil, ellers fastsatte eksakte regler. Ingen sammenligningsresultater for hovedmaterialet foreligger ennå.

## Planlagt separat klinisk tillegg – ikke generert

250 nye kliniske syntetiske tilfeller planlegges med samme algoritme, men t = a + b − 1. a skal trekkes fra et nedre Rasch-punkt tilsvarende noe under 3:6, opp til 0,000. Rasch 0 tilsvarer exp(1,968) år, omtrent 7,156 år. Formålet er lavere prestasjon relativt kronologisk alder og bedre dekning av lave modellpersentiler og ekstremverdier.

Eksakt nedre grense, et nytt frø og en egen ID-serie må fastsettes før dette tillegget gjennomføres. Den nåværende hovedgeneratoren har ingen klinisk forskyvning og brukes ikke til å generere disse 250 tilfellene i dette oppdraget.

**Bevares:** pilotmaterialet, produksjonskode, pilotparametere og sammenligningsregler. **Forbedres:** en separat, parameterstyrt adapter og dokumentasjon for hovedmaterialet. **Verifiseres:** generering, filformat, lokale beregninger og reproduksjon. **Diskuteres senere:** nøyaktige grenser for det kliniske tillegget og de kommende manuelle eksportresultatene.
