# Simuleringsrapport – etappe 9A

200 syntetiske registreringer, frø 20261113. Valgt sigma_b: **0.85**. Ingen sammenligning mellom programmene er utført.

## Generering

Mulberry32 og Box–Muller; separate deterministiske personstrømmer og faste trekk per oppgave gir samme grunnleggende tilfeldige tall i alle forsøk. a er uniform mellom -2.9158938248213855 og 3.7313848736069484: aldersmodellens verdier ved 3,5 og 18 år, utvidet 0,10 på hver side. Invers alder er exp(1,968 + 0,254a), trunkert med programmets yearDecToMonth. Registrert alder behandles deretter som manuell med halvmånedstillegg, uten datoer. Ingen avkorting til rapportens aldersgrenser.

Etter prosjektets eiers nye opplysninger om referansegruppens momenter ble normalfordelt b utvidet til en svakt venstreskjev fordeling med noe tyngre haler. For Z fra standard normalfordeling brukes:

b = sigma_b × [Z + c(Z² − 1) + k(Z³ − 3Z)] / sqrt(1 + 2c² + 6k²)

c = -0.02, k = 0.005. De ortogonale polynomleddene gir teoretisk E[b] = 0 og SD[b] = sigma_b. De 200 trukne b-verdiene har gjennomsnitt 0.03612670377172988 og utvalgsstandardavvik 0.7602368012632439. Ingen sentrering eller standardisering av det realiserte utvalget gjøres.

Oppgavene sorteres etter vanskelighetsgrad og deretter oppgavenummer. Nærmeste startoppgave velges; ved lik avstand den første i sorteringen. Vektene er 1, exp(t−g+0,39), exp(2(t−g)). Stopp følger ankomstretting; startoppgaven tilhører begge retninger. Skår 1 bruker rangavstand fra sist skårede oppgave. Avsluttede retninger utelukkes, med unntak for minimum to oppgaver. Maksimum er fem. Navn og merknader bruker uavhengige store bokstaver fra det norske alfabetet. Kjønn trekkes med sannsynlighetene 50/48/2 prosent.

Forsøkene startet med sigma_b = 0. Etter undersøkelse av spredning og enkle formjusteringer i minnet ble denne varianten valgt som en praktisk avveining mellom referansemomentene, midtgruppen og de øvre persentilene. Det er ingen presis statistisk tilpasning, og ingen barn byttes ut eller håndplukkes. Bare den endelige registreringsgruppen leveres.

## Resultat

Antall skårede oppgaver per barn: 10–22, gjennomsnitt 14.525. Alle områder har 2–5. Differansenes utvalgsstandardavvik (n−1), før avrunding: 0.887857381382076; etter avrunding: 0.8880357396379785.

Referansemomentene nedenfor er oppgitt av prosjektets eier fra manualen. Den oppgitte skevheten er korrigert til −0,28. Manualens nøyaktige estimatorer for skevhet og kurtose er ikke kontrollert; sammenligningen er derfor veiledende. Her brukes sentrale momenter m_j = sum((x − gjennomsnitt)^j)/n, skevhet m_3/m_2^(3/2), kurtose m_4/m_2² (normalfordeling = 3), og SD med n−1 i nevneren.

| Mål | Referansegruppen | Simulert, uavrundet | Simulert, avrundet 0,05 |
|---|---:|---:|---:|
| Gjennomsnitt | 0,003 | 0.07742451643636633 | 0.0782500000000001 |
| Standardavvik | 0,78 | 0.887857381382076 | 0.8880357396379785 |
| Skevhet | −0,28 | -0.32671520512482954 | -0.31993152797489904 |
| Kurtose | 3,60 | 4.009940099327188 | 3.9706166342352764 |

Avrundede differanser: -3.95 til 2.15.

- Modellpersentil 0: 0 (0 %)
- Modellpersentil 30–70: 52 (26 %)
- Modellpersentil 100: 1 (0.5 %)
- Differanse over 1,70: 4 (2 %); referanse ca. 2 %.
- Differanse under −1,35: 7 (3.5 %); referanse ca. 1 %.
- Differanse til og med −1,35: 7 (3.5 %); referanse ca. 2 %.
- −0,35 til 0,20, begge inkludert: 50 (25 %); referanse ca. 35 %.

Referanseprosentene er avrundede tall fra 272 barn. Den valgte fordelingen har negativ skevhet og tyngre haler, men gjennomsnitt og standardavvik ligger høyere enn i referansegruppen. Ingen registrering får modellpersentil 0 i denne leveransen; den nedre yttergrensen under −4,20 dekkes ikke. Hele referansefordelingen gjenskapes derfor ikke. Utvalget er et syntetisk verifiseringsmateriale, ikke en representativ klinisk populasjon.

## Kontroller

Alle 200 filer er serialisert og lest tilbake med ordinær serializer/parser; feltene er identiske. Beregningen lykkes for alle med registrert alder. Gjentatt simulering er identisk inklusive filbytes. Windows-1252, CRLF og NUBUMotor_100 følger ordinær serializer. Separate tester kontrollerer oppgavegrenser, unike valg, aldersregler og bytes. SHA256SUMS.txt identifiserer filene. Faktisk åpning i Windows-programmet og senere dataeksport gjenstår.

## Kumulativ fordeling

Avrunding: Math.round(differanse × 20) / 20, som programmet.

| Grense (≤) | Tabell 12.3 (%) | Simulert (%) |
|---|---:|---:|
| -4.2 | 0 | 0 |
| -2.5 | 1 | 0.5 |
| -2.05 | 1 | 0.5 |
| -1.4 | 1 | 3.5 |
| -1.35 | 2 | 3.5 |
| -1.3 | 4 | 4 |
| -1.2 | 4 | 7.5 |
| -1.15 | 6 | 8 |
| -1.1 | 6 | 9 |
| -1.05 | 7 | 9 |
| -1 | 9 | 10 |
| -0.95 | 10 | 12.5 |
| -0.9 | 11 | 13.5 |
| -0.85 | 13 | 15 |
| -0.8 | 14 | 16 |
| -0.75 | 16 | 18 |
| -0.7 | 18 | 21.5 |
| -0.65 | 19 | 23.5 |
| -0.6 | 21 | 25 |
| -0.55 | 22 | 25 |
| -0.5 | 24 | 29 |
| -0.45 | 26 | 31.5 |
| -0.4 | 28 | 32.5 |
| -0.35 | 31 | 34 |
| -0.3 | 34 | 37.5 |
| -0.25 | 35 | 39 |
| -0.2 | 39 | 40.5 |
| -0.15 | 42 | 43 |
| -0.1 | 44 | 45 |
| -0.05 | 48 | 46 |
| 0 | 52 | 49.5 |
| 0.05 | 54 | 53 |
| 0.1 | 56 | 55 |
| 0.15 | 58 | 56.5 |
| 0.2 | 63 | 57.5 |
| 0.25 | 66 | 57.5 |
| 0.3 | 69 | 58.5 |
| 0.35 | 72 | 60 |
| 0.4 | 75 | 62 |
| 0.45 | 78 | 63.5 |
| 0.5 | 80 | 65 |
| 0.55 | 81 | 67.5 |
| 0.6 | 83 | 70.5 |
| 0.65 | 85 | 72.5 |
| 0.7 | 87 | 75 |
| 0.75 | 88 | 75.5 |
| 0.8 | 88 | 79.5 |
| 0.85 | 89 | 80.5 |
| 0.9 | 89 | 82 |
| 0.95 | 90 | 83 |
| 1 | 92 | 84.5 |
| 1.05 | 93 | 86 |
| 1.1 | 94 | 87 |
| 1.15 | 94 | 90 |
| 1.25 | 95 | 91 |
| 1.3 | 96 | 92 |
| 1.4 | 96 | 94 |
| 1.55 | 97 | 96 |
| 1.65 | 97 | 97 |
| 1.7 | 98 | 98 |
| 1.75 | 99 | 99 |
| 2 | 99 | 99.5 |
| 2.05 | 99 | 99.5 |
| 2.1 | 100 | 99.5 |
| 3 | 100 | 100 |
