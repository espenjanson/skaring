# Pilotrapport – sammenligning av eksportfiler

## Observasjoner

Windows: 250 unike ID. Webb: 250 unike ID. Sammenfallende ID: 250. Bare Windows: 0. Bare webb: 0. Dupliserte og tomme ID avvises av verktøyet. Matching bruker eksakt FILNAVN, ikke radposisjon eller initialene i NAVN.

Alle individuelt sammenlignbare felt og sammensetningskontrollen er eksakt like etter formatavkoding. Antall avvik utenfor toleranse, ensidig manglende verdi eller manglende ID: 0.

## Format og kolonnemapping

- main/exports/261113 Win 02.dat: windows-1252, uten BOM, 250 poster, 14 kolonner; radslutt CRLF/LF/CR = 251/0/0; avsluttende radslutt: ja. SHA-256: ae73b742f174e80f2bab89ad96d9f31cf2c38bf72e2487b5f6e8cccb1e47ced0.
- main/exports/261113 Web 02.dat: utf-8, UTF-8-BOM, 250 poster, 18 kolonner; radslutt CRLF/LF/CR = 251/0/0; avsluttende radslutt: ja. SHA-256: 8bff9334546f8ae354d82af8f57126888cd87aa402cc81e73df7c055c928a3b6.

Windows-formatet med 14 kolonner har 13 direkte motstykker i webbformatets 18 kolonner. Rubrikkaliaset RASCHSKÅRE → RASCHSKÅR er kjent skjema, ikke en endring av data. De tre webbkolonnene FØDSELSDATO, TESTDATO og VIST ALDER mangler Windows-motstykke. MERKNAD og MERKNAD 2 kan heller ikke sammenlignes individuelt; de kontrolleres separat som MERKNAD + ett mellomrom + MERKNAD 2 mot MERKNADER. Denne kontrollen verifiserer ikke feltgrensen. Ingen manglende kolonne fylles med tom tekst eller antatte verdier. Dersom begge filer har 18 kolonner, sammenlignes alle 18 direkte.

TSV-avkoding fjerner bare strukturelle anførselstegn og avkoder doble anførselstegn. Ingen trimming, omkoding av oppgavetegn, endring av ID, avrunding av verdier eller annen innholdsnormalisering utføres. Avvikende BOM, tegnkoding, rubrikker og radslutt beskrives her separat fra resultatavvik.

## Regler og toleranser

LOGALDER, RASCHSKÅR og STANDARDFEIL: absolutt toleranse 0,0005, inkludert grensen. Rasch/standardfeil følger tidligere verifisering i docs/Etapp_7A_berakningsverifiering.md. LOGALDER følger prosjektets eiers uttrykkelige godkjenning i pilotoppdraget. Toleransen for eksportens tre desimaler utvides ikke til 0,001 mellom to avrundede eksporter. Sammenligningen kan ikke avgjøre uavrundede underliggende forskjeller.

MODELLBASERT PERSENTIL: numerisk toleranse 0. FILNAVN, NAVN, KJØNN, FØDSELSDATO, TESTDATO, VIST ALDER, MERKNAD, MERKNAD 2, OPPGAVESKÅRER, MINESTIMERT, MAKSESTIMERT, ALDERSEKVIVALENT og begge konfidensgrensene: eksakt tekst, ingen toleranse. Å:M og grenseuttrykk som «Lavere enn 3:6» omregnes ikke til tall.

«Eksakt» gjelder avkodet felttekst. «Format» betyr ulik tekst med samme tallverdi. «Innenfor» er en reell tallforskjell større enn 0 og høyst toleransen. «Utenfor» gjelder andre innholdsforskjeller. Ensidig manglende verdi vises separat; to tomme verdier regnes som eksakte og telles også i «Begge tomme». «Ingen kolonne» betyr ikke sammenlignbart. Δ = webb − Windows. Negativ/positiv og middel-Δ gjelder numeriske par, også eksakte; en tom verdi er aldri null.

## Alle 18 kolonner

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor |
|---|---:|---:|---:|---:|---:|
| FILNAVN | 250 | 250 | 0 | 0 | 0 |
| NAVN | 250 | 250 | 0 | 0 | 0 |
| KJØNN | 250 | 250 | 0 | 0 | 0 |
| FØDSELSDATO | 0 | 0 | 0 | 0 | 0 |
| TESTDATO | 0 | 0 | 0 | 0 | 0 |
| VIST ALDER | 0 | 0 | 0 | 0 | 0 |
| LOGALDER | 250 | 250 | 0 | 0 | 0 |
| MERKNAD | 0 | 0 | 0 | 0 | 0 |
| MERKNAD 2 | 0 | 0 | 0 | 0 | 0 |
| OPPGAVESKÅRER | 250 | 250 | 0 | 0 | 0 |
| RASCHSKÅR | 250 | 250 | 0 | 0 | 0 |
| STANDARDFEIL | 250 | 250 | 0 | 0 | 0 |
| MINESTIMERT | 250 | 250 | 0 | 0 | 0 |
| MAKSESTIMERT | 250 | 250 | 0 | 0 | 0 |
| ALDERSEKVIVALENT | 250 | 250 | 0 | 0 | 0 |
| NEDRE GRENSE KONF.INT. | 250 | 250 | 0 | 0 | 0 |
| ØVRE GRENSE KONF.INT. | 250 | 250 | 0 | 0 | 0 |
| MODELLBASERT PERSENTIL | 250 | 250 | 0 | 0 | 0 |

Sammensetningskontroll (kommer i tillegg til de 18 kolonnene):

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor |
|---|---:|---:|---:|---:|---:|
| MERKNADER (sammensetningskontroll) | 250 | 250 | 0 | 0 | 0 |

### Manglende verdier og kolonner

Ensidig tomme verdier kommer i tillegg til Eksakt/Format/Innenfor/Utenfor i oversikten ovenfor. Begge tomme er en delmengde av Eksakt. Sammenlignet + Ingen kolonne = antall matchende ID.

| Kolonne | Ensidig tom | Begge tomme | Ingen kolonne |
|---|---:|---:|---:|
| FILNAVN | 0 | 0 | 0 |
| NAVN | 0 | 0 | 0 |
| KJØNN | 0 | 0 | 0 |
| FØDSELSDATO | 0 | 0 | 250 |
| TESTDATO | 0 | 0 | 250 |
| VIST ALDER | 0 | 0 | 250 |
| LOGALDER | 0 | 0 | 0 |
| MERKNAD | 0 | 0 | 250 |
| MERKNAD 2 | 0 | 0 | 250 |
| OPPGAVESKÅRER | 0 | 0 | 0 |
| RASCHSKÅR | 0 | 0 | 0 |
| STANDARDFEIL | 0 | 0 | 0 |
| MINESTIMERT | 0 | 0 | 0 |
| MAKSESTIMERT | 0 | 0 | 0 |
| ALDERSEKVIVALENT | 0 | 0 | 0 |
| NEDRE GRENSE KONF.INT. | 0 | 6 | 0 |
| ØVRE GRENSE KONF.INT. | 0 | 6 | 0 |
| MODELLBASERT PERSENTIL | 0 | 0 | 0 |
| MERKNADER (sammensetningskontroll) | 0 | 0 | 0 |

### Numerisk størrelse og retning

Alle øvrige kolonner har eksakt tekstregel uten numerisk toleranse. Negativ Δ betyr lavere webbverdi; positiv Δ betyr høyere webbverdi.

| Kolonne | Abs.tol. | Numeriske par | Maks abs. Δ | Negativ Δ | Positiv Δ | Middel-Δ |
|---|---:|---:|---:|---:|---:|---:|
| LOGALDER | 0.0005 | 250 | 0 | 0 | 0 | 0 |
| RASCHSKÅR | 0.0005 | 250 | 0 | 0 | 0 | 0 |
| STANDARDFEIL | 0.0005 | 250 | 0 | 0 | 0 | 0 |
| MODELLBASERT PERSENTIL | 0 | 250 | 0 | 0 | 0 | 0 |

## Alle avvik utenfor toleranse og mangler

Ingen. Den maskinlesbare avvikslisten inneholder derfor bare rubrikkraden hvis også øvrige forskjeller mangler.

Bare Windows: ingen. Bare webb: ingen.

## Undersøkelse av mønstre

Gruppene bruker webbverdier for alder, Rasch, standardfeil og antall gyldige oppgaver (kun 0/1/2). Ekstremflagg registreres hvis minst ett program setter min- eller maksflagget. «Med forskjell» inkluderer format og tolererte forskjeller; «Med alvorlig avvik» gjelder utenfor toleranse eller ensidig tom verdi. ID som mangler i én fil vises ovenfor og inngår ikke i disse gruppene.

| Variabel | Gruppe | Antall | Med forskjell | Med alvorlig avvik |
|---|---|---:|---:|---:|
| Ekstremflagg (min/maks) | Ingen | 244 | 0 | 0 |
| Ekstremflagg (min/maks) | Minst ett program | 6 | 0 | 0 |
| Gyldige oppgaver (webb) | 0–14 | 137 | 0 | 0 |
| Gyldige oppgaver (webb) | 15–19 | 98 | 0 | 0 |
| Gyldige oppgaver (webb) | 20–50 | 15 | 0 | 0 |
| Rasch (webb) | <−1 | 63 | 0 | 0 |
| Rasch (webb) | −1–<1 | 78 | 0 | 0 |
| Rasch (webb) | ≥1 | 109 | 0 | 0 |
| Standardfeil (webb) | 0,4–<0,6 | 66 | 0 | 0 |
| Standardfeil (webb) | <0,4 | 147 | 0 | 0 |
| Standardfeil (webb) | ≥0,6 | 37 | 0 | 0 |
| Vist alder (webb) | 12–<17 | 55 | 0 | 0 |
| Vist alder (webb) | 4–<8 | 100 | 0 | 0 |
| Vist alder (webb) | 8–<12 | 58 | 0 | 0 |
| Vist alder (webb) | <4 | 23 | 0 | 0 |
| Vist alder (webb) | ≥17 | 14 | 0 | 0 |

## Vurdering og avgrensning

Ingen observerte forskjeller varierer med alder, Rasch, standardfeil, ekstremflagg eller antall oppgaver: alle sammenlignbare felt er like i dette materialet. Det finnes dermed ikke et avviksmønster å beregne korrelasjoner for. Dette er god overensstemmelse ved eksportens presisjon, men beviser ikke identiske interne beregninger eller riktighet utenfor pilotmaterialet.

Datoer, vist alder og de individuelle merknadsfeltene kan ikke verifiseres mot en 14-kolonners Windows-eksport. Pilotens syntetiske alders- og oppgaveutvalg erstatter heller ikke egne dato- og grensefall. Ekstremflagg finnes for 6 av de matchende ID-ene; dekningen av slike tilfeller må tas med i vurderingen. Ingen endring av skåringsprogrammet eller generering av 1 000 nye registreringer inngår. Hovedsimuleringen krever prosjektets eiers godkjenning.
