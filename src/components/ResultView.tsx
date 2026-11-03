"use client";

import { useEffect, useRef } from "react";

import { ReportPage } from "./ReportPage";
import type { Registration } from "../domain/registration";
import { calculateResult, resultAreas } from "../domain/results";
import type { ResultSettings } from "../domain/results";

/** Report controls stay separate from the printable A4 document. */
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
      <h1 id="result-heading" ref={heading} tabIndex={-1}>Vis resultat</h1>
      <div className="result-options">
      <fieldset className="result-area-controls">
        <legend>Resultatet beregnes ut fra:</legend>
        {resultAreas.map(area => <label key={area}>
          <input type="checkbox" checked={settings.areas.includes(area)} onChange={event => onSettingsChange({
            ...settings,
            areas: event.target.checked
              ? resultAreas.filter(value => value === area || settings.areas.includes(value))
              : settings.areas.filter(value => value !== area),
          })} />
          {area}-oppgaver
        </label>)}
      </fieldset>
      <label className="result-rasch-control"><input type="checkbox" checked={settings.showRasch} onChange={event => onSettingsChange({ ...settings, showRasch: event.target.checked })} />Vis Rasch-skår</label>
      </div>
      <button type="button" className="print-result" disabled={!result.canPrint} onClick={() => { if (result.canPrint) window.print(); }}>Skriv ut…</button>
    </div>
    <div className="result-presentation" aria-live="polite" aria-atomic="true">
      {result.kind === "unavailable"
        ? <div className="report-unavailable"><p role="status">{result.message}</p></div>
        : <ReportPage report={result.report} />}
    </div>
  </section>;
}
