"use client";

import { useEffect, useRef } from "react";

/** Keeps screen controls separate from the presentation that stage 7 will replace. */
export function ResultView({ back }: { back: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="result-view" aria-labelledby="result-heading">
    <div className="result-controls">
      <button type="button" className="back-control" onClick={back}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M17 10H3M9 4l-6 6 6 6" />
        </svg>
        Tilbake
      </button>
    </div>
    <div className="result-presentation">
      <h1 id="result-heading" ref={heading} tabIndex={-1}>Resultat av motoriske oppgaver i NUBU 4-16</h1>
      <p>Resultatvisning kommer i neste etappe.</p>
    </div>
  </section>;
}
