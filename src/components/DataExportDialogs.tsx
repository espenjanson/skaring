"use client";

import { useId, useState } from "react";
import { Modal } from "./FileDialogs";
import { fileNameError } from "../file/fileName";
import { fileNameMessage } from "../file/fileMessages";
import type { useDataExport } from "../app/useDataExport";

function ExportDownload({ count, cancel, download }: { count: number; cancel: () => void; download: (name: string) => void }) {
  const [name, setName] = useState("Data.txt");
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  return <Modal title="Last ned dataeksport" cancel={cancel}>
    <p>{count} registreringer er klare for eksport.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const problem = fileNameError(name);
      if (problem) { setError(fileNameMessage(problem)); return; }
      download(name);
    }}>
      <label className="dialog-field" htmlFor={id}>Filnavn:
        <input id={id} value={name} onChange={event => { setName(event.target.value); setError(null); }} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
      </label>
      {error && <p id={`${id}-error`} className="dialog-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="submit">Last ned</button><button type="button" onClick={cancel}>Avbryt</button></div>
    </form>
  </Modal>;
}

/** Export dialogs share the existing modal behavior and keep temporary bytes out of form state. */
export function DataExportDialogs({ flow }: { flow: ReturnType<typeof useDataExport> }) {
  const { state, cancel } = flow;
  return <>
    <input ref={flow.input} type="file" hidden multiple aria-label="Velg mappe for dataeksport" onChange={flow.selected} />
    {(state.kind === "choosing" || state.kind === "reading") && <Modal title="Dataeksport" cancel={cancel}>
      <p role="status">{state.kind === "choosing" ? "Velg en mappe i mappevelgeren." : "Leser og beregner registreringer …"}</p>
      <div className="dialog-actions"><button type="button" onClick={cancel}>Avbryt</button></div>
    </Modal>}
    {state.kind === "ready" && <ExportDownload count={state.count} cancel={cancel} download={flow.download} />}
    {state.kind === "message" && <Modal title={state.error ? "Dataeksporten ble avbrutt" : "Dataeksport"} cancel={cancel}>
      <p role={state.error ? "alert" : "status"}>{state.text}</p>
      <div className="dialog-actions"><button type="button" onClick={cancel}>Lukk</button></div>
    </Modal>}
  </>;
}
