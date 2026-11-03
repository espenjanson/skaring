import { ReportGraphics } from "../report/graphics"
import type { ReportDocument } from "../report/graphics"
import type { ItemArea, ModelPercentileResult } from "../api/skaring"
import type { Registration } from "./registration"

export const resultAreas: readonly ItemArea[] = ["A", "B", "C", "D", "E"]

/** Presentation settings are independent of registration content and file status. */
export type ResultSettings = {
  areas: readonly ItemArea[]
  showRasch: boolean
}

export function initialResultSettings(): ResultSettings {
  return { areas: [...resultAreas], showRasch: false }
}

export type ResultPresentation =
  | {
      kind: "unavailable"
      canPrint: false
      message: string
    }
  | {
      kind: "available"
      canPrint: true
      report: ReportDocument
      areas: readonly ItemArea[]
      validCount: number
      rawScore: number
      displayAge: string
      ageEquivalent: string
      confidenceInterval:
        | { kind: "available"; lower: string; upper: string }
        | { kind: "not-computable"; message: string }
      modelPercentile: ModelPercentileResult
      rasch: { estimate: string; standardError: string | null } | null
    }

export const insufficientResultMessage =
  "Resultat kan bare vises når minst tre oppgaver er gjennomført innenfor de valgte områdene."

/** One local calculation path for opening the view and changing its settings. */
export function calculateResult(
  registration: Registration,
  settings: ResultSettings,
): ResultPresentation {
  // A fresh instance prevents any derived state surviving a rejected calculation.
  const engine = new ReportGraphics()
  const status = engine.calculateRegistration(registration, settings.areas)
  if (status !== -10000) {
    return {
      kind: "unavailable",
      canPrint: false,
      message: status === -10005
        ? "Velg minst ett område for å vise resultat."
        : status === -10001 || status === -10004
          ? insufficientResultMessage
          : "Resultatet kunne ikke beregnes. Kontroller registreringen og prøv igjen.",
    }
  }
  engine.svShowRasch = settings.showRasch
  engine.navn_value = registration.name
  engine.gutt_value = registration.gender === "gutt"
  engine.jente_value = registration.gender === "jente"
  const report = engine.buildReport(registration)
  const hasInterval = !engine.gIsMinEstimated && !engine.gIsMaxEstimated
  return {
    kind: "available",
    canPrint: true,
    report,
    areas: resultAreas.filter(area => settings.areas.includes(area)),
    validCount: engine.gNValid,
    rawScore: [...engine.gRawItemScoreString].reduce(
      (sum, value) => sum + (value === "0" || value === "1" || value === "2" ? Number(value) : 0),
      0,
    ),
    displayAge: engine.alder_value,
    ageEquivalent: engine.estimateToPresentText(engine.gMeasure),
    confidenceInterval: hasInterval
      ? {
          kind: "available",
          lower: engine.estimateToPresentText(engine.gMeasure - 1.96 * engine.gSE),
          upper: engine.estimateToPresentText(engine.gMeasure + 1.96 * engine.gSE),
        }
      : {
          kind: "not-computable",
          message: engine.gIsMinEstimated
            ? "Alle oppgaver er skåret 0. Konfidensintervall kan ikke beregnes."
            : "Alle oppgaver er skåret 2. Konfidensintervall kan ikke beregnes.",
        },
    modelPercentile: engine.modelPercentile(),
    rasch: settings.showRasch
      ? {
          estimate: engine.gMeasure.toFixed(2),
          standardError: hasInterval ? engine.gSE.toFixed(2) : null,
        }
      : null,
  }
}
