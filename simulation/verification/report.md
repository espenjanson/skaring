# Slutrapport – fem manuelle eksportpar, 1 250 tilfeller

## Kontroll av kildene

Alle ti faktiske eksportfiler er lest med det godkjente sammenligningsverktøyet. Hvert par har nøyaktig de forventede 250 unike ID-ene. Samlet ID-mengde er S0201–S1450 uten hull eller overlapp. Pilotens S0001–S0200 inngår ikke i denne totalsummen.

Alle fem Windows-filer har Windows-1252 uten BOM, 14 kolonner og CRLF. Alle fem webbfiler har UTF-8 med BOM, 18 kolonner og CRLF. Samtlige har 251 poster inklusive rubrikk og avsluttende CRLF. Dette er dokumenterte formatforskjeller, ikke resultatavvik. Se pairs/ for kildefiler, kontrollsummer og individuelle rapporter.

## A. Ordinær hovedsimulering – 1 000 tilfeller

S0201–S1200. 13000 direkte feltkontroller er eksakt like. 1000 sammensetningskontroller av merknader er eksakt like.

| Eksportmål | Windows | Webb |
|---|---:|---:|
| Rasch, gjennomsnitt (SD) | 0,484 (2,243) | 0,484 (2,243) |
| Rasch, min–maks | -6,061–5,834 | -6,061–5,834 |
| Standardfeil, gjennomsnitt | 0,456 | 0,456 |
| Rekonstruert differanse, gjennomsnitt (SD) | 0,048 (0,999) | 0,048 (0,999) |
| Negativ rekonstruert differanse | 480 | 480 |
| Modellpersentil 0 | 0 | 0 |
| Modellpersentil ≤2 | 86 | 86 |
| Modellpersentil ≤5 | 107 | 107 |
| Modellpersentil ≤15 | 206 | 206 |
| Modellpersentil 30–70 | 292 | 292 |
| Modellpersentil 100 | 26 | 26 |
| Minestimert | 3 | 3 |
| Maksestimert | 17 | 17 |
| Rasch < −4,20 | 8 | 8 |
| Rasch < −5 | 3 | 3 |

## B. Klinisk komplettering – 250 tilfeller

S1201–S1450. 3250 direkte feltkontroller er eksakt like. 250 sammensetningskontroller av merknader er eksakt like.

| Eksportmål | Windows | Webb |
|---|---:|---:|
| Rasch, gjennomsnitt (SD) | -2,389 (1,412) | -2,389 (1,412) |
| Rasch, min–maks | -6,061–0,587 | -6,061–0,587 |
| Standardfeil, gjennomsnitt | 0,514 | 0,514 |
| Rekonstruert differanse, gjennomsnitt (SD) | -1,014 (1,106) | -1,014 (1,106) |
| Negativ rekonstruert differanse | 210 | 210 |
| Modellpersentil 0 | 2 | 2 |
| Modellpersentil ≤2 | 85 | 85 |
| Modellpersentil ≤5 | 105 | 105 |
| Modellpersentil ≤15 | 151 | 151 |
| Modellpersentil 30–70 | 37 | 37 |
| Modellpersentil 100 | 1 | 1 |
| Minestimert | 9 | 9 |
| Maksestimert | 0 | 0 |
| Rasch < −4,20 | 23 | 23 |
| Rasch < −5 | 9 | 9 |

Kliniske minestimerte ID (Windows): S1257, S1263, S1281, S1284, S1331, S1367, S1389, S1413, S1419. Maksestimerte: ingen. Fullt persentilhistogram og ID-er for begge programmene finnes i summary.json.

## C. Samtlige 1 250 – programoverensstemmelse

| Gruppe | ID | Eksakte direkte felt | Format | Numerisk innenfor | Utenfor | Ensidig tom | Eksakte sammensatte merknader |
|---|---:|---:|---:|---:|---:|---:|---:|
| A_ordinary1000 | 1000 | 13000 | 0 | 0 | 0 | 0 | 1000 |
| B_clinical250 | 250 | 3250 | 0 | 0 | 0 | 0 | 250 |
| C_all1250 | 1250 | 16250 | 0 | 0 | 0 | 0 | 1250 |

Ingen innholdsavvik, numeriske avvik eller formateringsforskjeller i avkodede sammenlignbare felt er observert i noen av de fem parene. Toleransene behøvde ikke å tas i bruk.

### Alle 18 kolonner

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor | Ensidig tom | Ikke sammenlignbar | Maks abs. numerisk Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| FILNAVN | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| NAVN | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| KJØNN | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| FØDSELSDATO | 0 | 0 | 0 | 0 | 0 | 0 | 1250 | — |
| TESTDATO | 0 | 0 | 0 | 0 | 0 | 0 | 1250 | — |
| VIST ALDER | 0 | 0 | 0 | 0 | 0 | 0 | 1250 | — |
| LOGALDER | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | 0 |
| MERKNAD | 0 | 0 | 0 | 0 | 0 | 0 | 1250 | — |
| MERKNAD 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1250 | — |
| OPPGAVESKÅRER | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| RASCHSKÅR | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | 0 |
| STANDARDFEIL | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | 0 |
| MINESTIMERT | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| MAKSESTIMERT | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| ALDERSEKVIVALENT | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| NEDRE GRENSE KONF.INT. | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| ØVRE GRENSE KONF.INT. | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | — |
| MODELLBASERT PERSENTIL | 1250 | 1250 | 0 | 0 | 0 | 0 | 0 | 0 |

De fem webbkolonnene uten individuell Windows-motpart er ikke erklært verifisert: FØDSELSDATO, TESTDATO, VIST ALDER, MERKNAD og MERKNAD 2. Den separate sammenstillingen MERKNAD + ett mellomrom + MERKNAD 2 kontrollerer samlet tekst, ikke feltgrensen. Kjønn, flagg, oppgavetegn, Å:M-tekster og intervalluttrykk sammenlignes eksakt. Toleransene er uendret: 0,0005 for LOGALDER/Rasch/standardfeil og 0 for numerisk modellpersentil. Strukturell TSV-citering avkodes uten trimming eller innholdsnormalisering.

## Mønstre og begrensninger

Ingen observerte avvik varierer med alder, Rasch, standardfeil, ekstremflagg eller antall oppgaver, fordi ingen avvik finnes. Korrelasjoner med avvik kan derfor ikke beregnes meningsfullt. Retningen webb minus Windows, gjennomsnittlig numerisk forskjell og tegnfordeling finnes i parrapportene og summary.json.

Statistikken i A og B bygger på faktiske eksportverdier fra hvert program og holdes atskilt. SD bruker n−1. «Rekonstruert differanse» beregnes fra eksportert Rasch (tre desimaler) minus forventet Rasch fra det parede webbfeltets registrerte alder, med eksisterende dato-/aldersregler inklusive manuelt halvmånedstillegg. Dette er en avledet beskrivende størrelse, ikke et eksportert uavrundet internt resultat eller en selvstendig Windows-aldersverifisering. Modellpersentiler og ekstremflagg er derimot lest direkte fra eksportene.

Overensstemmelse ved eksportens presisjon er sterk verifikasjon for dette materialet, men beviser ikke identiske interne uavrundede verdier eller alle mulige registreringer. Eksakte datoer og de fem manglende individuelle Windows-kolonnene kan ikke verifiseres av denne sammenligningen.

Alle tidligere filer og de ti manuelle eksportene bevares. Produksjonskode og godkjente sammenligningsregler er uendret. Ingen nye registreringer, commit eller push inngår. Reproduserbar kjøring og tester er dokumentert i README.md.
