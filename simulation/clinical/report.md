# Klinisk kompletteringssimulering – 250 tilfeller

## Status og avgrensning

250 nye syntetiske registreringer, S1201–S1450, er generert med frø 20261115. Dette er et stressmateriale for lave aldersrelaterte resultater, ikke en representativ klinisk populasjon.

**Alle Rasch-estimater, differanser fra estimatet, modellpersentiler, standardfeil og ekstremflagg nedenfor er foreløpige simuleringsresultater**, beregnet lokalt med eksisterende modell. De er ikke en Windows- eller webbdataeksport og dokumenterer ikke overensstemmelse mellom programmene. Ingen programsammenligning av hoved- eller klinisk materiale er gjennomført her.

## Eksakte grenser og metode

Programmets aldersmodell er R(y) = −1,968/0,254 + ln(y)/0,254. Ved 3,5 år gir den -2.8158938248213854. Som i pilot og hovedsimulering trekkes nedre grense 0,10 Rasch-enheter ned:

- Nedre a-grense: **-2.9158938248213855**.
- Øvre a-grense: **0.000**.
- Inversen y = exp(1,968 + 0,254a) gir **3.412219531272693** til **7.156349467166773** år, før visningstrunkering.

a trekkes uniformt fra [nedre, øvre), med samme generatorprinsipp som tidligere. Visningsalderen er basert på a, ikke på t. Invers alder trunkeres med eksisterende yearDecToMonth til Å:M. Registrert manuell alder får deretter halvmånedstillegget 1/24 år når aldersforventet Rasch beregnes. De mulige visningsaldrene er 3:4–7:1. Fødselsdato og testdato er tomme. Det lille skillet mellom a og Rasch-verdien av den registrerte alderen beholdes.

b har nøyaktig hovedsimuleringens fordeling: sigma_b = 0,85, c = −0,02, k = 0,005; b = 0,85 × [Z − 0,02(Z²−1) + 0,005(Z³−3Z)] / sqrt(1 + 2×0,02² + 6×0,005²), der Z genereres med Box–Muller fra Mulberry32. Teoretisk E[b] = 0 og SD[b] = 0,85. t = a + b − 1. Ingen ekstra sentrering, tilpasning av frø, utskifting av barn eller endring for å fremtvinge persentiler er gjort.

Oppgaveparametere, de tre vektene 1, exp(t−g+0,39) og exp(2(t−g)), adaptivt utvalg, avsluttede retninger, rangbaserte valg og 2–5-oppgaveregler gjenbrukes uendret. Kjønn trekkes med sannsynlighetene 50/48/2 prosent; navn og merknader bruker samme norske bokstavregler. Personstrømmene starter på (frø + imul(personnummer, 0x9e3779b9)) >>> 0. ID er uavhengig av trekkerekkefølgen.

## Klinisk materiale – beskrivende statistikk

SD er utvalgsstandardavvik med n−1. Skjevhet og kurtose bruker sentrale momenter med n i nevneren; normal kurtose er 3.

| Variabel | Gjennomsnitt | SD | Minimum | Maksimum |
|---|---:|---:|---:|---:|
| a | -1,374 | 0,856 | -2,912 | -0,007 |
| b | 0,062 | 0,898 | -2,060 | 2,910 |
| t | -2,312 | 1,204 | -5,473 | 0,723 |
| t − a | -0,938 | 0,898 | -3,060 | 1,910 |
| t − forventet Rasch fra registrert alder | -0,936 | 0,900 | -3,057 | 1,925 |
| Foreløpig Rasch-estimat | -2,389 | 1,412 | -6,061 | 0,587 |
| Foreløpig estimert differanse | -1,014 | 1,106 | -4,481 | 2,228 |
| Foreløpig differanse avrundet til 0,05 | -1,013 | 1,107 | -4,500 | 2,250 |

t − a er negativ for 213 (85,200 %). Foreløpig estimert differanse er negativ for 210 (84,000 %). Disse to differansene må ikke forveksles med hverandre eller med t minus forventet verdi fra registrert Å:M.

Kjønn: 126 (50,400 %) gutt, 117 (46,800 %) jente, 7 (2,800 %) udefinert. Registrert alder i måneder: 40,000–85,000, gjennomsnitt 61,476. Antall gyldige oppgaver per barn: 10–23, gjennomsnitt 13,332. Hvert område har 2–5.

| Hele år i registrert alder | Antall |
|---|---:|
| 3 | 47 |
| 4 | 72 |
| 5 | 62 |
| 6 | 59 |
| 7 | 10 |

| Område | 2 oppgaver | 3 oppgaver | 4 oppgaver | 5 oppgaver |
|---|---:|---:|---:|---:|
| A | 164 | 33 | 25 | 28 |
| B | 151 | 46 | 28 | 25 |
| C | 132 | 53 | 33 | 32 |
| D | 152 | 64 | 14 | 20 |
| E | 173 | 41 | 27 | 9 |

Av totalt 12 500 oppgavetegn er 0 = 1575, 1 = 1090, 2 = 668, 9 = 9167. Detaljert oppgaveantallshistogram finnes i summary.json.

## Foreløpige lave persentiler og ekstreme resultater

| Modellpersentil (foreløpig) | Kliniske 250 | Ordinære 1 000, separat referanse |
|---|---:|---:|
| 0 | 2 (0,800 %) | 0 (0,000 %) |
| 1–2 | 83 (33,200 %) | 86 (8,600 %) |
| 3–5 | 20 (8,000 %) | 21 (2,100 %) |
| 6–15 | 46 (18,400 %) | 99 (9,900 %) |
| >15 | 99 (39,600 %) | 794 (79,400 %) |

Kumulative lave andeler i klinisk materiale: ≤2 = 85 (34,000 %), ≤5 = 105 (42,000 %), ≤15 = 151 (60,400 %). Hele persentilhistogrammet, også 100, finnes i summary.json.

Foreløpige ekstremflagg: **minestimert 9, maksestimert 0**. Minestimert-ID: S1257, S1263, S1281, S1284, S1331, S1367, S1389, S1413, S1419. Maksestimert-ID: ingen. Flaggene beholdes som modellresultater; de er ikke bare terskler for lave/høye Rasch-verdier.

«Særlig lave Rasch-verdier» beskrives med tre eksplisitte, absolutte rapportgrenser. De er ikke diagnostiske kriterier. −4,20 her gjelder selve Rasch-estimatet, ikke differansegrensen i Tabell 12.3.

| Foreløpig Rasch-estimat strengt under | Klinisk antall | Ordinært antall |
|---|---:|---:|
| -2.8158938248213854 | 87 | 74 |
| -4.2 | 23 | 8 |
| -5 | 9 | 3 |

### Gruppene holdes atskilt

| Foreløpig beregnet mål | Kliniske 250 | Ordinære 1 000 |
|---|---:|---:|
| Estimert differanse, gjennomsnitt | -1,014 | 0,048 |
| Estimert differanse, SD | 1,106 | 0,999 |
| Min-/maksflagg | 9/0 | 3/17 |

Forskjellene beskriver modellen og de to separate utvalgene. De dokumenterer ikke programavvik eller en representativ klinisk fordeling. Ingen samlet 1 250-falls programstatistikk foreligger ennå.

## Filer, kontroll og neste steg

registreringer/ inneholder nøyaktig 250 filer uten filendelse. Ordinær serializer gir NUBUMotor_100, Windows-1252 uten BOM og CRLF. Alle er lest tilbake med ordinær parser og kan beregnes med ordinær modell. Alle har 50 tegn i 0/1/2/9, 2–5 gyldige skårer per område og 10–25 totalt. Utvalgsrekkefølgen har ingen gjentatte oppgaver.

Adapteren gir eksakt samme 1 000 tilfeller som hovedgeneratoren når hovedinnstillingene brukes. Kliniske tilfeller er generert to ganger og sammenlignet inklusive filbytes. ID, bytes og starttilstander er skilt fra tidligere tilfeller. SHA256SUMS.txt beskytter de nye registreringene. previous-preservation.json beskytter alle tidligere simuleringsfiler, inkludert de åtte manuelt produserte hovedeksportene, uten å sammenligne dem.

generation.tsv og summary.json merker beregnede resultater som foreløpige. De er simuleringsinformasjon, ikke erstatninger for ekte programdataeksporter. README.md beskriver de to manuelle eksportene og den planlagte A/B/C-rapporten etter fem ekte eksportpar og brukerens godkjenning.

**Bevares:** alle tidligere filer, produksjonskode og sammenligningsregler. **Verifiseres:** generering og reproduksjon. **Forbedres:** separat dekning av lavere latent funksjonsnivå. **Diskuteres ved neste etappe:** den faktiske programoverensstemmelsen, etter manuell eksport og godkjenning.
