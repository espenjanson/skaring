"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FileWorkflowPhase } from "../domain/fileWorkflow";
import type { SaveValidationDecision } from "../domain/saveValidation";
import { fileNameError } from "../file/fileName";
import { fileNameMessage } from "../file/fileMessages";

function Modal({ title, cancel, children }: { title: string; cancel: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    const field = element.querySelector<HTMLInputElement>("input");
    field?.focus();
    field?.select();
    return () => { if (element.open) element.close(); };
  }, []);
  return <dialog ref={dialog} className="file-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); cancel(); }}>
    <div className="dialog-caption"><h2 id={titleId}>{title}</h2>
      <button type="button" className="dialog-close" aria-label="Avbryt og lukk dialogen" onClick={cancel}>×</button>
    </div>
    {children}
  </dialog>;
}

type NamePhase = Extract<FileWorkflowPhase, { kind: "file-name" }>;
function FileNameDialog({ phase, cancel, choose }: { phase: NamePhase; cancel: () => void; choose: (name: string) => void }) {
  const [name, setName] = useState(phase.suggestedName);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  return <Modal title="Last ned registrering" cancel={cancel}>
    <form onSubmit={event => {
      event.preventDefault();
      const problem = fileNameError(name);
      if (problem) { setError(fileNameMessage(problem)); return; }
      choose(name);
    }}>
      <label className="dialog-field" htmlFor={inputId}>Filnavn:
        <input id={inputId} value={name} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={event => { setName(event.target.value); setError(null); }} />
      </label>
      {error && <p id={`${inputId}-error`} className="dialog-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="submit">Last ned</button><button type="button" onClick={cancel}>Avbryt</button></div>
    </form>
  </Modal>;
}

type ValidationPhase = Extract<FileWorkflowPhase, { kind: "validation" }>;
function ValidationDialog({ phase, cancel, choose }: { phase: ValidationPhase; cancel: () => void; choose: (decision: SaveValidationDecision) => void }) {
  const { problem, candidate } = phase.validation;
  const pair = problem.kind === "date-pair-out-of-range";
  const singleField = problem.kind === "date-pair-out-of-range" ? null : problem.field;
  const label = singleField === "birthDate" ? "Født dato" : singleField === "testDate" ? "Testdato" : "Alder";
  const [value, setValue] = useState(singleField ? candidate[singleField] : "");
  const [birth, setBirth] = useState(candidate.birthDate);
  const [test, setTest] = useState(candidate.testDate);
  const prefix = useId();
  return <Modal title="Kontroller dato og alder" cancel={cancel}>
    <form onSubmit={event => {
      event.preventDefault();
      choose(pair ? { kind: "correct-dates", birthDate: birth, testDate: test } : { kind: "correct", value });
    }}>
      <p>{pair
        ? "Datoene gir en alder utenfor 1:6–99:11. Rett datoene, eller fortsett med begge datoene og den viste alderen uendret."
        : problem.kind === "invalid-manual-age"
          ? "Alder er ugyldig. Bruk Å:M fra 1:6 til 99:11, eller fortsett med feltet tomt."
          : `${label} er ugyldig. Bruk dag.måned.år, eller fortsett med dette feltet tomt.`}</p>
      {pair ? <>
        <label className="dialog-field" htmlFor={`${prefix}-birth`}>Født dato:<input id={`${prefix}-birth`} value={birth} onChange={event => setBirth(event.target.value)} /></label>
        <label className="dialog-field" htmlFor={`${prefix}-test`}>Testdato:<input id={`${prefix}-test`} value={test} onChange={event => setTest(event.target.value)} /></label>
      </> : <label className="dialog-field" htmlFor={prefix}>{label}:<input id={prefix} value={value} onChange={event => setValue(event.target.value)} /></label>}
      <div className="dialog-actions">
        <button type="submit">Bruk retting</button>
        <button type="button" onClick={() => choose({ kind: "continue" })}>{pair ? "Fortsett og behold verdiene" : "Fortsett med tomt felt"}</button>
        <button type="button" onClick={cancel}>Avbryt</button>
      </div>
    </form>
  </Modal>;
}

interface FileDialogsProps {
  phase: FileWorkflowPhase;
  cancel(token: number): void;
  nameChosen(token: number, name: string): void;
  validationChosen(token: number, decision: SaveValidationDecision): void;
  formatChosen(token: number, choice: "continue" | "cancel"): void;
  unsavedChosen(token: number, choice: "save" | "discard" | "cancel"): void;
  clearChosen(token: number, confirmed: boolean): void;
}

/** Token keys reset dialog drafts only when the workflow advances to a new step. */
export function FileDialogs(props: FileDialogsProps) {
  const { phase } = props;
  if (phase.kind === "unsaved-changes") return <Modal key={phase.token} title="Det er ulagrede endringer." cancel={() => props.cancel(phase.token)}>
    <p>Vil du laste ned endringene før du fortsetter?</p>
    <div className="dialog-actions">
      <button type="button" onClick={() => props.unsavedChosen(phase.token, "save")}>Last ned</button>
      <button type="button" onClick={() => props.unsavedChosen(phase.token, "discard")}>Fortsett uten nedlasting</button>
      <button type="button" onClick={() => props.cancel(phase.token)}>Avbryt</button>
    </div>
  </Modal>;
  if (phase.kind === "clear-confirmation") return <Modal key={phase.token} title="Tøm formular" cancel={() => props.cancel(phase.token)}>
    <p>Tømme alle feltene? Ulagrede endringer går tapt.</p>
    <div className="dialog-actions"><button type="button" onClick={() => props.clearChosen(phase.token, true)}>OK</button>
      <button type="button" onClick={() => props.cancel(phase.token)}>Avbryt</button></div>
  </Modal>;
  if (phase.kind === "file-name") return <FileNameDialog key={phase.token} phase={phase} cancel={() => props.cancel(phase.token)} choose={name => props.nameChosen(phase.token, name)} />;
  if (phase.kind === "validation") return <ValidationDialog key={phase.token} phase={phase} cancel={() => props.cancel(phase.token)} choose={decision => props.validationChosen(phase.token, decision)} />;
  if (phase.kind === "unknown-format") return <Modal key={phase.token} title="Ukjent filformat. Vil du fortsette?" cancel={() => props.cancel(phase.token)}>
    <div className="dialog-actions"><button type="button" onClick={() => props.formatChosen(phase.token, "continue")}>Fortsett</button>
      <button type="button" onClick={() => props.cancel(phase.token)}>Avbryt</button></div>
  </Modal>;
  return null;
}
