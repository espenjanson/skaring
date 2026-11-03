"use client";

import { useEffect, useRef } from "react";

import type { Registration } from "../domain/registration";
import { calculateResult, resultAreas } from "../domain/results";
import type { ResultSettings } from "../domain/results";

/** Temporary control presentation; all numerical rules remain outside React. */
export function ResultView({ back, registration, settings, onSettingsChange }: {
  back: () => void;
  registration: Registration;
  settings: ResultSettings;
  onSettingsChange: (settings: ResultSettings) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const result = calculateResult(registration, settings);

  return <section className="result-view" aria-labelledby="result-heading" data-printable={result.canPrint}>
    <div className="result-controls">
      <button type="button" className="back-control" onClick={back}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M17 10H3M9 4l-6 6 6 6" />
        </svg>
        Tilbake
      </button>
      <h1 id="result-heading" ref={heading} tabIndex={-1}>Resultat av motoriske oppgaver i NUBU 4-16</h1>
      <fieldset className="result-area-controls">
        <legend>Oppgaver som inngår i resultatet</legend>
        {resultAreas.map(area => <label key={area}>
          <input type="checkbox" checked={settings.areas.includes(area)} onChange={event => onSettingsChange({
            ...settings,
            areas: event.target.checked
              ? resultAreas.filter(value => value === area || settings.areas.includes(value))
              : settings.areas.filter(value => value !== area),
          })} />
          Område {area}
        </label>)}
      </fieldset>
      <label className="result-rasch-control"><input type="checkbox" checked={settings.showRasch} onChange={event => onSettingsChange({ ...settings, showRasch: event.target.checked })} />Vis Rasch-skår</label>
    </div>
    <div className="result-presentation" aria-live="polite" aria-atomic="true">
      {result.kind === "unavailable" ? <p role="status">{result.message}</p> : <>
        <h2>Midlertidig resultatoversikt</h2>
        <dl className="result-values">
          <dt>Valgte områder</dt><dd>{result.areas.join(", ")}</dd>
          <dt>Gjennomførte oppgaver</dt><dd>{result.validCount}</dd>
          <dt>Poengsum</dt><dd>{result.rawScore}</dd>
          <dt>Alder</dt><dd>{result.displayAge || "Ikke oppgitt"}</dd>
          <dt>Samleskår (aldersekvivalent)</dt><dd>{result.ageEquivalent}</dd>
          <dt>95% konfidensintervall</dt><dd>{result.confidenceInterval.kind === "available"
            ? `${result.confidenceInterval.lower} – ${result.confidenceInterval.upper}`
            : result.confidenceInterval.message}</dd>
          <dt>Modellbasert persentil</dt><dd>{result.modelPercentile.kind === "available"
            ? `${result.modelPercentile.value}. persentilen`
            : "Persentil basert på statistisk modell kan ikke beregnes."}</dd>
          {result.rasch && <>
            <dt>Samleskår (Rasch-skår)</dt><dd>{result.rasch.estimate}</dd>
            <dt>Standardfeil</dt><dd>{result.rasch.standardError ?? "Standardfeil for skåren kan ikke beregnes."}</dd>
          </>}
        </dl>
      </>}
    </div>
  </section>;
}
