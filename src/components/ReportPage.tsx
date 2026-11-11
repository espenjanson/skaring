import type { ReportDocument, ReportField, ReportGraphic } from "../report/graphics"

// Font sizes use the same 1/100 mm units as geometry, so both scale together.
const unitsPerPoint = 100 * 25.4 / 72
// Ten-point leading keeps the full subset/Rasch block above the unchanged graph.
const resultLineHeight = 1.25
const colors: Record<string, string> = { black: "#000", lightGray: "#cccccc", darkGray: "#555" }

function fieldContent(field: ReportField) {
  if (field.valueOffset !== undefined) {
    const [label, value] = field.text.split("\t")
    return <span style={{ display: "grid", gridTemplateColumns: `${field.valueOffset}px 1fr` }}><span>{label}</span><span>{value}</span></span>
  }
  if (!field.lastWordBold) return field.text
  const match = /^(.*\s)(\S+)$/s.exec(field.text)
  return match ? <>{match[1]}<strong>{match[2]}</strong></> : field.text
}

function Graphic({ object }: { object: ReportGraphic }) {
  const { x1, y1, x2, y2 } = object.bounds
  if (!object.visible) return null
  if (object.kind === "line") return <line data-object={object.id}
    x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors[object.color] ?? object.color}
    strokeWidth={(object.style === "thick" ? 4 : 1) * unitsPerPoint}
    strokeDasharray={object.style === "dotted" ? `${unitsPerPoint} ${2 * unitsPerPoint}` : undefined}
    opacity={object.transparent ? 0.65 : 1} />
  if (object.kind === "rectangle") return <rect data-object={object.id}
    x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)}
    fill={object.fill ? "#000" : "none"} fillOpacity={object.fill ? 0.25 : 1}
    stroke="#000" strokeWidth={unitsPerPoint} />
  return <foreignObject data-object={object.id} x={x1} y={y1} width={x2 - x1} height={y2 - y1}>
    <div className="report-field" style={{
      width: "100%", height: "100%", overflow: "hidden", margin: 0, padding: 0,
      fontFamily: object.face === "Courier" ? '"Courier New", Courier, monospace' : "Arial, Helvetica, sans-serif",
      fontSize: object.size * unitsPerPoint, lineHeight: object.id === "output" ? resultLineHeight : object.id.startsWith("AreaPrompt_") ? 1 : 1.12,
      fontWeight: object.style === "bold" ? 700 : 400,
      textDecoration: object.style === "underline" ? "underline" : undefined,
      color: colors[object.color] ?? object.color, textAlign: object.align,
      whiteSpace: object.id === "output" || object.singleLine ? "pre" : "pre-wrap",
      overflowWrap: object.id === "merknad" || object.id === "merknad2" ? "anywhere" : "normal",
      tabSize: 8,
    }}>{fieldContent(object)}</div>
  </foreignObject>
}

/** The same A4 viewBox is uniformly scaled on screen and printed at physical size. */
export function ReportPage({ report }: { report: ReportDocument }) {
  return <svg className="report-sheet" viewBox="0 0 21000 29700" role="group"
    aria-label="Resultatrapport på A4" xmlns="http://www.w3.org/2000/svg">
    <rect width="21000" height="29700" fill="white" />
    {report.objects.map(object => <Graphic key={object.id} object={object} />)}
  </svg>
}
