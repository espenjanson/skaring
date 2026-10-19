"use client"

import { useEffect, useState } from "react"
import { Registration, RegistrationFileState, registrationStatus, createRegistration, copyRegistration, registrationsEqual, itemLabels, singleLine, isItemCharacter } from "../domain/registration"
import "./registration.css"

export default function Page() {
  const [data, setData] = useState<Registration | null>(null)
  const [reference, setReference] = useState<Registration | null>(null)
  // Only a completed file operation may change this lifecycle state in a future stage.
  const [fileState] = useState<RegistrationFileState>({ kind: "new" })
  // Browser initialization avoids server timezone differences.
  useEffect(() => {
    const initial = createRegistration(new Date())
    setData(initial)
    setReference(copyRegistration(initial))
  }, [])
  const dirty = !!data && !!reference && !registrationsEqual(data, reference)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = "" }
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  if (!data) return <main className="registration-window">Laster skjema …</main>
  function change(field: "name" | "note" | "note2" | "birthDate" | "testDate" | "age", value: string) {
    setData(current => current && ({ ...current, [field]: singleLine(value) }))
  }
  return <main className="registration-window">
    <div className="window-caption">Skåring av motoriske oppgaver i NUBU 4-16 (Ikke lagret)</div>
    <div className="registration-content">
      <h1>Skåring av motoriske oppgaver i NUBU 4-16</h1>
      <form autoComplete="off" onSubmit={event => event.preventDefault()}>
        <div className="person-fields">
          <label className="wide-field"><span>Navn:</span><input value={data.name} onChange={e => change("name", e.target.value)} /></label>
          <div className="details-row">
            <fieldset className="gender"><legend>Kjønn:</legend>{(["gutt", "jente"] as const).map(gender => <label key={gender}><input type="radio" name="gender" checked={data.gender === gender} onChange={() => setData(current => current && ({ ...current, gender }))} />{gender === "gutt" ? "Gutt" : "Jente"}</label>)}</fieldset>
            <label className="date-field">Født dato:<input aria-describedby="stage-note" value={data.birthDate} onChange={e => change("birthDate", e.target.value)} /></label>
            <label className="date-field">Testdato:<input aria-describedby="stage-note" value={data.testDate} onChange={e => change("testDate", e.target.value)} /></label>
            <label className="age-field">Alder:<input aria-describedby="stage-note" value={data.age} onChange={e => change("age", e.target.value)} /></label>
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
          setData(createRegistration(new Date()))
        }}>Tøm formular</button><button type="button" disabled>Vis resultat</button></div>
      </form>
      <p className="change-status" role="status">{reference && registrationStatus(data, reference, fileState)}</p>
      <p id="stage-note" className="stage-note">Prøveversjon av hovedbildet. Datoformat: DD.MM.ÅÅÅÅ. Alder: Å:M. Dato og alder er foreløpig tekstfelt uten kontroll eller automatisk aldersberegning. Lagring og resultatvisning er ikke tilgjengelig. Innholdet går tapt når siden lukkes.</p>
    </div>
  </main>
}
