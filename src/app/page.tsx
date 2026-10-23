"use client"

import { useCallback, useEffect, useState } from "react"
import { createRegistration, itemLabels, singleLine, isItemCharacter } from "../domain/registration"
import { FileDialogs } from "../components/FileDialogs"
import { useRegistrationFiles } from "./useRegistrationFiles"
import { registrationCaption } from "../file/fileMessages"
import "./registration.css"
import { DateField, dateAge, editRegistrationDate, finishRegistrationDate, finishManualAge, manualAgeError, parseDate } from "../domain/dateAge"

export default function Page() {
  const [checked, setChecked] = useState({ birthDate: false, testDate: false, age: false, pair: false })
  const resetChecked = useCallback(() => setChecked({ birthDate: false, testDate: false, age: false, pair: false }), [])
  const files = useRegistrationFiles(resetChecked)
  const data = files.state?.current
  const setData = files.edit
  const dirty = files.state?.status === "Ulagrede endringer"
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault(); event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  if (!data || !files.state) return <main className="registration-window">Laster skjema …</main>
  const phase = files.state.phase
  const busy = phase.kind !== "idle"
  function change(field: "name" | "note" | "note2" | "age", value: string) {
    setData(current => current && ({ ...current, [field]: singleLine(value) }))
  }
  function editDate(field: DateField, text: string) {
    setData(current => current && editRegistrationDate(current, field, singleLine(text)))
    setChecked(current => ({ ...current, [field]: false, pair: false }))
  }
  function finishDate(field: DateField) {
    setData(current => current && finishRegistrationDate(current, field))
    setChecked(current => ({ ...current, [field]: true, pair: true }))
  }
  const pair = dateAge(data.birthDate, data.testDate)
  const birthError = checked.birthDate && parseDate(data.birthDate).kind === "invalid"
    ? "Ugyldig dato. Bruk dag.måned.år." : null
  const testError = checked.testDate && parseDate(data.testDate).kind === "invalid"
    ? "Ugyldig dato. Bruk dag.måned.år."
    : checked.pair && pair.kind === "reversed" ? "Testdato er tidligere enn født dato." : null
  const ageError = [
    checked.pair && pair.kind === "out-of-range" ? "Datoene gir alder utenfor 1:6–99:11." : null,
    checked.age && data.ageSource === "manual" ? manualAgeError(data.age) : null,
  ].filter(Boolean).join(" ") || null
  return <main className="registration-window">
    <div className="window-caption">{registrationCaption(files.state)}</div>
    <div className="file-commands" role="group" aria-label="Fil">
      <button type="button" disabled={busy} onClick={files.open}>Åpne…</button>
      <button type="button" disabled={busy} onClick={files.download}>Last ned…</button>
    </div>
    <input ref={files.input} type="file" hidden aria-label="Velg registreringsfil" onChange={files.selected} />
    {files.message && <div className={`file-feedback${files.message.kind === "error" ? " file-error" : ""}`} role={files.message.kind === "error" ? "alert" : "status"}><span>{files.message.text}</span><button type="button" onClick={files.dismissMessage}>Lukk melding</button></div>}
    {(phase.kind === "reading" || phase.kind === "choose-file") && <div className="file-feedback" role="status">
      <span>{phase.kind === "reading" ? "Leser fil …" : "Velg en fil i filvelgeren."}</span>
      <button type="button" onClick={() => files.cancel(phase.token)}>Avbryt åpning</button>
    </div>}
    <div className="registration-content">
      <h1>Skåring av motoriske oppgaver i NUBU 4-16</h1>
      <form autoComplete="off" onSubmit={event => event.preventDefault()}>
        <fieldset className="registration-form" disabled={busy}>
        <div className="person-fields">
          <label className="wide-field"><span>Navn:</span><input value={data.name} onChange={e => change("name", e.target.value)} /></label>
          <div className="details-row">
            <fieldset className="gender"><legend className="sr-only">Kjønn:</legend><span className="gender-caption" aria-hidden="true">Kjønn:</span>{(["gutt", "jente"] as const).map(gender => <label key={gender}><input type="radio" name="gender" checked={data.gender === gender} onChange={() => setData(current => current && ({ ...current, gender }))} />{gender === "gutt" ? "Gutt" : "Jente"}</label>)}</fieldset>
            <div className="date-control"><label className="date-field" htmlFor="birth-date">Født dato:<input id="birth-date" aria-invalid={!!birthError} aria-describedby={birthError ? "birth-error" : undefined} value={data.birthDate} onChange={e => editDate("birthDate", e.target.value)} onBlur={() => finishDate("birthDate")} /></label>{birthError && <span id="birth-error" className="field-error" role="status">{birthError}</span>}</div>
            <div className="date-control"><label className="date-field" htmlFor="test-date">Testdato:<input id="test-date" aria-invalid={!!testError} aria-describedby={testError ? "test-error" : undefined} value={data.testDate} onChange={e => editDate("testDate", e.target.value)} onBlur={() => finishDate("testDate")} /></label>{testError && <span id="test-error" className="field-error" role="status">{testError}</span>}</div>
            <div className="date-control age-control"><label className="age-field" htmlFor="age">Alder:<input id="age" aria-invalid={!!ageError} aria-describedby={ageError ? "age-error" : data.ageSource === "automatic" ? "automatic-age" : undefined} readOnly={data.ageSource === "automatic"} value={data.age} onChange={e => { change("age", e.target.value); setChecked(current => ({ ...current, age: false })) }} onBlur={() => {
              setData(current => current && finishManualAge(current))
              setChecked(current => ({ ...current, age: true }))
            }} /></label>{ageError && <span id="age-error" className="field-error" role="status">{ageError}</span>}<span id="automatic-age" className="sr-only">Alder beregnes automatisk fra datoene.</span></div>
          </div>
          <label className="wide-field"><span>Merknad:</span><input value={data.note} onChange={e => change("note", e.target.value)} /></label>
          <label className="wide-field"><span>Merknad 2:</span><input value={data.note2} onChange={e => change("note2", e.target.value)} /></label>
        </div>
        <fieldset className="tasks"><legend className="sr-only">Motoriske oppgaver</legend>
          <p>Skårer på motoriske oppgaver (0, 1 eller 2 for de oppgavene som barnet har gjort):</p>
          <div className="task-columns">{Array.from({ length: 5 }, (_, column) => <div className="task-column" key={column}>{itemLabels.slice(column * 10, column * 10 + 10).map((label, row) => {
            const index = column * 10 + row
            return <label className="task-field" key={label}><span>{label}</span><input aria-label={label} maxLength={1} value={data.items[index]} onChange={event => {
              const value = event.target.value
              if (value !== "" && !isItemCharacter(value)) return
              setData(current => {
                if (!current) return current
                const items = [...current.items]
                items[index] = value
                return { ...current, items }
              })
            }} /></label>
          })}</div>)}</div>
        </fieldset>
        <div className="form-actions"><button type="button" onClick={() => {
          if (dirty && !window.confirm("Tømme alle feltene? Ulagrede endringer går tapt.")) return
          // Clearing is an edit; the original reference remains unchanged.
          setData(() => createRegistration(new Date()))
          setChecked({ birthDate: false, testDate: false, age: false, pair: false })
        }}>Tøm formular</button><button type="button" disabled>Vis resultat</button></div>
        </fieldset>
      </form>
      <p className="change-status" role="status">{files.state.status}</p>
      <p id="stage-note" className="stage-note">Dato: dag.måned.år (tosifret år betyr 2000–2099). Gyldige datoer formateres når du forlater feltet. Alder beregnes automatisk ved gyldig datopar og alder 1:6–99:11; ellers kan du skrive Å:M. Resultatvisning er ennå ikke tilgjengelig.</p>
    </div>
    <FileDialogs phase={phase} cancel={files.cancel} nameChosen={files.nameChosen} validationChosen={files.validationChosen} formatChosen={files.formatChosen} />
  </main>
}
