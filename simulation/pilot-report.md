# Pilotrapport – sammenligning av eksportfiler

## Observasjoner

Windows: 200 unike ID. Webb: 200 unike ID. Sammenfallende ID: 200. Bare Windows: 0. Bare webb: 0. Dupliserte og tomme ID avvises av verktøyet. Matching bruker eksakt FILNAVN, ikke radposisjon eller initialene i NAVN.

Alle individuelt sammenlignbare felt og sammensetningskontrollen er eksakt like etter formatavkoding. Antall avvik utenfor toleranse, ensidig manglende verdi eller manglende ID: 0.

## Format og kolonnemapping

- 261113 1128 Dataexport registreringer.dat: windows-1252, uten BOM, 200 poster, 14 kolonner; radslutt CRLF/LF/CR = 201/0/0; avsluttende radslutt: ja. SHA-256: a6c42a05ce55dc79eef19048a20f3670a31f2407756cf6c68844209b4c631d13.
- 261113 1135 webb Dataeksport.txt: utf-8, UTF-8-BOM, 200 poster, 18 kolonner; radslutt CRLF/LF/CR = 201/0/0; avsluttende radslutt: ja. SHA-256: fa6975aa48e30687815ece52a962aa5fa89aa69f04e750b4aac65c2604d7e75c.

Windows-formatet med 14 kolonner har 13 direkte motstykker i webbformatets 18 kolonner. Rubrikkaliaset RASCHSKÅRE → RASCHSKÅR er kjent skjema, ikke en endring av data. De tre webbkolonnene FØDSELSDATO, TESTDATO og VIST ALDER mangler Windows-motstykke. MERKNAD og MERKNAD 2 kan heller ikke sammenlignes individuelt; de kontrolleres separat som MERKNAD + ett mellomrom + MERKNAD 2 mot MERKNADER. Denne kontrollen verifiserer ikke feltgrensen. Ingen manglende kolonne fylles med tom tekst eller antatte verdier. Dersom begge filer har 18 kolonner, sammenlignes alle 18 direkte.

TSV-avkoding fjerner bare strukturelle anførselstegn og avkoder doble anførselstegn. Ingen trimming, omkoding av oppgavetegn, endring av ID, avrunding av verdier eller annen innholdsnormalisering utføres. Avvikende BOM, tegnkoding, rubrikker og radslutt beskrives her separat fra resultatavvik.

## Regler og toleranser

LOGALDER, RASCHSKÅR og STANDARDFEIL: absolutt toleranse 0,0005, inkludert grensen. Rasch/standardfeil følger tidligere verifisering i docs/Etapp_7A_berakningsverifiering.md. LOGALDER følger prosjektets eiers uttrykkelige godkjenning i pilotoppdraget. Toleransen for eksportens tre desimaler utvides ikke til 0,001 mellom to avrundede eksporter. Sammenligningen kan ikke avgjøre uavrundede underliggende forskjeller.

MODELLBASERT PERSENTIL: numerisk toleranse 0. FILNAVN, NAVN, KJØNN, FØDSELSDATO, TESTDATO, VIST ALDER, MERKNAD, MERKNAD 2, OPPGAVESKÅRER, MINESTIMERT, MAKSESTIMERT, ALDERSEKVIVALENT og begge konfidensgrensene: eksakt tekst, ingen toleranse. Å:M og grenseuttrykk som «Lavere enn 3:6» omregnes ikke til tall.

«Eksakt» gjelder avkodet felttekst. «Format» betyr ulik tekst med samme tallverdi. «Innenfor» er en reell tallforskjell større enn 0 og høyst toleransen. «Utenfor» gjelder andre innholdsforskjeller. Ensidig manglende verdi vises separat; to tomme verdier regnes som eksakte og telles også i «Begge tomme». «Ingen kolonne» betyr ikke sammenlignbart. Δ = webb − Windows. Negativ/positiv og middel-Δ gjelder numeriske par, også eksakte; en tom verdi er aldri null.

## Alle 18 kolonner

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor |
|---|---:|---:|---:|---:|---:|
| FILNAVN | 200 | 200 | 0 | 0 | 0 |
| NAVN | 200 | 200 | 0 | 0 | 0 |
| KJØNN | 200 | 200 | 0 | 0 | 0 |
| FØDSELSDATO | 0 | 0 | 0 | 0 | 0 |
| TESTDATO | 0 | 0 | 0 | 0 | 0 |
| VIST ALDER | 0 | 0 | 0 | 0 | 0 |
| LOGALDER | 200 | 200 | 0 | 0 | 0 |
| MERKNAD | 0 | 0 | 0 | 0 | 0 |
| MERKNAD 2 | 0 | 0 | 0 | 0 | 0 |
| OPPGAVESKÅRER | 200 | 200 | 0 | 0 | 0 |
| RASCHSKÅR | 200 | 200 | 0 | 0 | 0 |
| STANDARDFEIL | 200 | 200 | 0 | 0 | 0 |
| MINESTIMERT | 200 | 200 | 0 | 0 | 0 |
| MAKSESTIMERT | 200 | 200 | 0 | 0 | 0 |
| ALDERSEKVIVALENT | 200 | 200 | 0 | 0 | 0 |
| NEDRE GRENSE KONF.INT. | 200 | 200 | 0 | 0 | 0 |
| ØVRE GRENSE KONF.INT. | 200 | 200 | 0 | 0 | 0 |
| MODELLBASERT PERSENTIL | 200 | 200 | 0 | 0 | 0 |

Sammensetningskontroll (kommer i tillegg til de 18 kolonnene):

| Kolonne | Sammenlignet | Eksakt | Format | Innenfor | Utenfor |
|---|---:|---:|---:|---:|---:|
| MERKNADER (sammensetningskontroll) | 200 | 200 | 0 | 0 | 0 |

### Manglende verdier og kolonner

Ensidig tomme verdier kommer i tillegg til Eksakt/Format/Innenfor/Utenfor i oversikten ovenfor. Begge tomme er en delmengde av Eksakt. Sammenlignet + Ingen kolonne = antall matchende ID.

| Kolonne | Ensidig tom | Begge tomme | Ingen kolonne |
|---|---:|---:|---:|
| FILNAVN | 0 | 0 | 0 |
| NAVN | 0 | 0 | 0 |
| KJØNN | 0 | 0 | 0 |
| FØDSELSDATO | 0 | 0 | 200 |
| TESTDATO | 0 | 0 | 200 |
| VIST ALDER | 0 | 0 | 200 |
| LOGALDER | 0 | 0 | 0 |
| MERKNAD | 0 | 0 | 200 |
| MERKNAD 2 | 0 | 0 | 200 |
| OPPGAVESKÅRER | 0 | 0 | 0 |
| RASCHSKÅR | 0 | 0 | 0 |
| STANDARDFEIL | 0 | 0 | 0 |
| MINESTIMERT | 0 | 0 | 0 |
| MAKSESTIMERT | 0 | 0 | 0 |
| ALDERSEKVIVALENT | 0 | 0 | 0 |
| NEDRE GRENSE KONF.INT. | 0 | 1 | 0 |
| ØVRE GRENSE KONF.INT. | 0 | 1 | 0 |
| MODELLBASERT PERSENTIL | 0 | 0 | 0 |
| MERKNADER (sammensetningskontroll) | 0 | 0 | 0 |

### Numerisk størrelse og retning

Alle øvrige kolonner har eksakt tekstregel uten numerisk toleranse. Negativ Δ betyr lavere webbverdi; positiv Δ betyr høyere webbverdi.

| Kolonne | Abs.tol. | Numeriske par | Maks abs. Δ | Negativ Δ | Positiv Δ | Middel-Δ |
|---|---:|---:|---:|---:|---:|---:|
| LOGALDER | 0.0005 | 200 | 0 | 0 | 0 | 0 |
| RASCHSKÅR | 0.0005 | 200 | 0 | 0 | 0 | 0 |
| STANDARDFEIL | 0.0005 | 200 | 0 | 0 | 0 | 0 |
| MODELLBASERT PERSENTIL | 0 | 200 | 0 | 0 | 0 | 0 |

## Alle avvik utenfor toleranse og mangler

Ingen. Den maskinlesbare avvikslisten inneholder derfor bare rubrikkraden hvis også øvrige forskjeller mangler.

Bare Windows: ingen. Bare webb: ingen.

## Undersøkelse av mønstre

Gruppene bruker webbverdier for alder, Rasch, standardfeil og antall gyldige oppgaver (kun 0/1/2). Ekstremflagg registreres hvis minst ett program setter min- eller maksflagget. «Med forskjell» inkluderer format og tolererte forskjeller; «Med alvorlig avvik» gjelder utenfor toleranse eller ensidig tom verdi. ID som mangler i én fil vises ovenfor og inngår ikke i disse gruppene.

| Variabel | Gruppe | Antall | Med forskjell | Med alvorlig avvik |
|---|---|---:|---:|---:|
| Ekstremflagg (min/maks) | Ingen | 199 | 0 | 0 |
| Ekstremflagg (min/maks) | Minst ett program | 1 | 0 | 0 |
| Gyldige oppgaver (webb) | 0–14 | 100 | 0 | 0 |
| Gyldige oppgaver (webb) | 15–19 | 85 | 0 | 0 |
| Gyldige oppgaver (webb) | 20–50 | 15 | 0 | 0 |
| Rasch (webb) | <−1 | 46 | 0 | 0 |
| Rasch (webb) | −1–<1 | 67 | 0 | 0 |
| Rasch (webb) | ≥1 | 87 | 0 | 0 |
| Standardfeil (webb) | 0,4–<0,6 | 43 | 0 | 0 |
| Standardfeil (webb) | <0,4 | 135 | 0 | 0 |
| Standardfeil (webb) | ≥0,6 | 22 | 0 | 0 |
| Vist alder (webb) | 12–<17 | 53 | 0 | 0 |
| Vist alder (webb) | 4–<8 | 86 | 0 | 0 |
| Vist alder (webb) | 8–<12 | 46 | 0 | 0 |
| Vist alder (webb) | <4 | 9 | 0 | 0 |
| Vist alder (webb) | ≥17 | 6 | 0 | 0 |

## Vurdering og avgrensning

Ingen observerte forskjeller varierer med alder, Rasch, standardfeil, ekstremflagg eller antall oppgaver: alle sammenlignbare felt er like i dette materialet. Det finnes dermed ikke et avviksmønster å beregne korrelasjoner for. Dette er god overensstemmelse ved eksportens presisjon, men beviser ikke identiske interne beregninger eller riktighet utenfor pilotmaterialet.

Datoer, vist alder og de individuelle merknadsfeltene kan ikke verifiseres mot en 14-kolonners Windows-eksport. Pilotens syntetiske alders- og oppgaveutvalg erstatter heller ikke egne dato- og grensefall. Ekstremflagg finnes for 1 av de matchende ID-ene; dekningen av slike tilfeller må tas med i vurderingen. Ingen endring av skåringsprogrammet eller generering av 1 000 nye registreringer inngår. Hovedsimuleringen krever prosjektets eiers godkjenning.
