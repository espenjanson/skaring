import { Skaring } from "../api/skaring"
import type { Registration } from "../domain/registration"

export type Bounds = { x1: number; y1: number; x2: number; y2: number }
type GraphicBase = { id: string; bounds: Bounds; sourceBounds: Bounds; visible: boolean }
export type ReportField = GraphicBase & {
  kind: "field"
  text: string
  face: string
  size: number
  style: string
  color: string
  align: "left" | "center" | "right"
  lastWordBold: boolean
  singleLine: boolean
  valueOffset?: number
}
export type ReportLine = GraphicBase & {
  kind: "line"
  color: string
  transparent: boolean
  style: string
}
export type ReportRectangle = GraphicBase & { kind: "rectangle"; fill: boolean }
export type ReportGraphic = ReportField | ReportLine | ReportRectangle
export type ReportDocument = { objects: readonly ReportGraphic[]; outsideMargins: readonly string[] }

export const reportFooter = [
  "Grete Andrup, Harald Janson og Bente Gjærum: NUBU 4-16 Motorisk test. © 2008 Universitetsforlaget.",
  "Dataprogram: Harald Janson 2026, med støtte fra Espen Janson og bruk av KI (ChatGPT fra OpenAI).",
] as const

/** Implements the legacy drawing API while leaving the calculation class intact. */
export class ReportGraphics extends Skaring {
  private readonly objects = new Map<string, ReportGraphic>()

  private put(object: ReportGraphic): void {
    const key = object.id.toLowerCase()
    if (this.objects.has(key)) throw new Error(`Duplicate report object: ${object.id}`)
    this.objects.set(key, object)
  }

  private object(id: string): ReportGraphic {
    const object = this.objects.get(id.toLowerCase())
    if (!object) throw new Error(`Missing report object: ${id}`)
    return object
  }

  private field(id: string): ReportField {
    const object = this.object(id)
    if (object.kind !== "field") throw new Error(`Expected report field: ${id}`)
    return object
  }

  override createField(id: string, sourceBounds: Bounds, text: string, visible: boolean,
    face: string, size: string, style: string, color: string, align: string): void {
    if (align !== "left" && align !== "center" && align !== "right") throw new Error("Invalid text alignment")
    this.put({ kind: "field", id, sourceBounds, bounds: this.convertVertices(sourceBounds), text,
      visible, face, size: size === "heading" ? 18 : 8, style, color, align,
      lastWordBold: false, singleLine: false })
  }

  override createLine(id: string, sourceBounds: Bounds, visible: boolean, color: string,
    transparent: boolean, style: string): void {
    this.put({ kind: "line", id, sourceBounds, bounds: this.convertVertices(sourceBounds),
      visible, color, transparent, style })
  }

  override createCIRectangle(sourceBounds: Bounds, visible: boolean): void {
    this.put({ kind: "rectangle", id: "CI", sourceBounds,
      bounds: this.convertVertices(sourceBounds), visible, fill: true })
  }

  override setFieldText(id: string, text: string): void { this.field(id).text = text }
  override setFieldVisibility(id: string, visible: boolean): void { this.field(id).visible = visible }
  override setFieldStrokeColor(id: string, color: string): void { this.field(id).color = color }
  override setLastWordBold(id: string, bold: boolean): void { this.field(id).lastWordBold = bold }
  override setLineVisibility(id: string, visible: boolean): void { this.object(id).visible = visible }
  override setRectangleVisibility(id: string, visible: boolean): void { this.object(id).visible = visible }

  override setLineVertices(id: string, sourceBounds: Bounds): void {
    const object = this.object(id)
    object.sourceBounds = sourceBounds
    object.bounds = this.convertVertices(sourceBounds)
  }

  override setRectangleVertices(id: string, sourceBounds: Bounds): void {
    this.setLineVertices(id, sourceBounds)
  }

  private moveField(id: string, bounds: Bounds): void {
    const object = this.field(id)
    object.sourceBounds = bounds
    object.bounds = this.convertVertices(bounds)
  }

  /** Supplement only the missing 2021 header objects and the requested footer. */
  buildReport(registration: Registration): ReportDocument {
    this.objects.clear()
    // Graph1 is already defined in the TypeScript source as rectangleGraph.
    this.put({ kind: "rectangle", id: "Graph1", sourceBounds: this.rectangleGraph,
      bounds: this.convertVertices(this.rectangleGraph), visible: true, fill: false })
    this.setGraph(0)
    this.setFieldText("headingfield", "Resultat for motoriske oppgaver i NUBU 4-16")
    this.setFieldText("led_navn", "Navn:")
    this.setFieldText("navn", registration.name)
    this.field("navn").singleLine = true
    this.setFieldText("led_kjonn", registration.gender
      ? `Kjønn:\t${registration.gender === "gutt" ? "Gutt" : "Jente"}` : "Kjønn:")

    // The 2021 documentation has one name row, one demographics row, and two
    // equally tall note rectangles. The later TypeScript header omitted these.
    this.moveField("led_kjonn", { x1: 912, y1: 1110, x2: 3273, y2: 1425 })
    this.field("led_kjonn").valueOffset = this.field("navn").bounds.x1 - this.field("led_kjonn").bounds.x1
    this.moveField("led_alder", { x1: 8150, y1: 1110, x2: 8675, y2: 1425 })
    this.moveField("alder", { x1: 8700, y1: 1110, x2: 9249, y2: 1425 })
    this.moveField("output", { x1: 924, y1: 2175, x2: 9180, y2: 8424 })
    const add = (id: string, bounds: Bounds, text: string) =>
      this.createField(id, bounds, text, true, "Sans", "small", "regular", "black", "left")
    add("led_fodtdato", { x1: 3700, y1: 1110, x2: 4550, y2: 1425 }, "Født dato:")
    add("fodtdato", { x1: 4550, y1: 1110, x2: 5950, y2: 1425 }, registration.birthDate)
    add("led_testdato", { x1: 6000, y1: 1110, x2: 6700, y2: 1425 }, "Testdato:")
    add("testdato", { x1: 6700, y1: 1110, x2: 8100, y2: 1425 }, registration.testDate)
    // Share the existing horizontal envelope equally, retaining a roughly 5 mm gap.
    const noteLeft = 912, noteRight = 9027, noteGap = 280
    const noteWidth = (noteRight - noteLeft - noteGap) / 2
    add("merknad", { x1: noteLeft, y1: 1440, x2: noteLeft + noteWidth, y2: 2115 }, registration.note)
    add("merknad2", { x1: noteLeft + noteWidth + noteGap, y1: 1440, x2: noteRight, y2: 2115 }, registration.note2)
    this.moveField("copyright", { x1: 516, y1: 14340, x2: 9570, y2: 14790 })
    this.setFieldText("copyright", reportFooter.join("\n"))

    const objects = Array.from(this.objects.values(), object => ({ ...object,
      bounds: { ...object.bounds }, sourceBounds: { ...object.sourceBounds } }))
    return {
      objects,
      outsideMargins: objects.filter(object => object.visible && (
        Math.min(object.bounds.x1, object.bounds.x2) < 2000 ||
        Math.max(object.bounds.x1, object.bounds.x2) > 19000 ||
        Math.min(object.bounds.y1, object.bounds.y2) < 2000 ||
        Math.max(object.bounds.y1, object.bounds.y2) > 27700
      )).map(object => object.id),
    }
  }
}
