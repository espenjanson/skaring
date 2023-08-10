export class Skaring {
  // System configurations
  sysDateFormat: string
  sysDecimal: string
  sysList: string

  // Global variables
  currentFile: string | null
  currentFileIsSaved: boolean
  svShowRasch: boolean

  // Other global variables
  gResult: number
  gCalculateDebugOutput: string
  gCalculateDebugCurrentState: string
  gMeasure: number
  gSE: number
  gNValid: number
  gIsMinEstimated: boolean
  gIsMaxEstimated: boolean
  gConvertParameter1: number
  gConvertParameter2: number
  gMinEstAge: number
  gMaxEstAge: number
  gRawItemScoreString: string
  gUseItemSubset: string
  gIsValidAE: boolean[]
  gAlder: number
  gModelPercentiles: number[][]
  gAgeGroupLabels: string[]
  gAgeGroupThresholds: number[][]
  gItemLabels: string[]

  constructor() {
    // System configurations
    this.sysDateFormat = "dd.mm.yyyy"
    this.sysDecimal = "."
    this.sysList = ","

    // Global variables
    this.currentFile = null
    this.currentFileIsSaved = true
    this.svShowRasch = false

    // Other global variables
    this.gResult = 0
    this.gCalculateDebugOutput = ""
    this.gCalculateDebugCurrentState = "Initialized."
    this.gMeasure = -9999
    this.gSE = -9999
    this.gNValid = 0
    this.gIsMinEstimated = true
    this.gIsMaxEstimated = true
    this.gConvertParameter1 = 1.968
    this.gConvertParameter2 = 0.254
    this.gMinEstAge = 3.5
    this.gMaxEstAge = 18
    this.gRawItemScoreString =
      "99999999999999999999999999999999999999999999999999"
    this.gUseItemSubset = "All"
    this.gIsValidAE = [false, false, false, false, false]
    this.gAlder = -9999

    // Model Percentiles
    this.gModelPercentiles = [
      [-4.2, 0],
      [-2.5, 1],
      [-2.05, 1],
      [-1.4, 1],
      [-1.35, 2],
      [-1.3, 4],
      [-1.2, 4],
      [-1.15, 6],
      [-1.1, 6],
      [-1.05, 7],
      [-1, 9],
      [-0.95, 10],
      [-0.9, 11],
      [-0.85, 13],
      [-0.8, 14],
      [-0.75, 16],
      [-0.7, 18],
      [-0.65, 19],
      [-0.6, 21],
      [-0.55, 22],
      [-0.5, 24],
      [-0.45, 26],
      [-0.4, 28],
      [-0.35, 31],
      [-0.3, 34],
      [-0.25, 35],
      [-0.2, 39],
      [-0.15, 42],
      [-0.1, 44],
      [-0.05, 48],
      [0, 52],
      [0.05, 54],
      [0.1, 56],
      [0.15, 58],
      [0.2, 63],
      [0.25, 66],
      [0.3, 69],
      [0.35, 72],
      [0.4, 75],
      [0.45, 78],
      [0.5, 80],
      [0.55, 81],
      [0.6, 83],
      [0.65, 85],
      [0.7, 87],
      [0.75, 88],
      [0.8, 88],
      [0.85, 89],
      [0.9, 89],
      [0.95, 90],
      [1, 92],
      [1.05, 93],
      [1.1, 94],
      [1.15, 94],
      [1.25, 95],
      [1.3, 96],
      [1.4, 96],
      [1.55, 97],
      [1.65, 97],
      [1.7, 98],
      [1.75, 99],
      [2, 99],
      [2.05, 99],
      [2.1, 100],
      [3, 100],
    ]

    // Age Group Labels
    this.gAgeGroupLabels = [
      "4-åringer",
      "5-åringer",
      "6-åringer",
      "7-åringer",
      "8-åringer",
      "9-åringer",
      "10-åringer",
      "11- og 12-åringer",
      "13- og 14-åringer",
      "15- og 16-åringer",
    ]

    // Age Group Thresholds
    this.gAgeGroupThresholds = [
      [-2.78, -1.85, -0.89],
      [-1.81, -0.92, -0.45],
      [-0.92, -0.46, 0.4],
      [-0.76, 0.04, 0.6],
      [-0.16, 0.57, 1.19],
      [0.18, 1.23, 1.93],
      [0.97, 1.88, 3.13],
      [1.36, 2.17, 3.0],
      [1.99, 2.64, 3.05],
      [2.24, 2.92, 3.77],
    ]

    // Item Labels
    this.gItemLabels = Array("ABCDE".length).reduce(
      (accumulator, currLetter) => {
        accumulator = [
          ...accumulator,
          ...Array(10)
            .fill(0)
            .map((_, numberIndex) => currLetter + (numberIndex + 1).toString()),
        ]
      },
      []
    )
  }

  prepareInputForOutput(argA: string): void {
    const minValidItems = 3
    const nineString = "9999999999999999999999999999999999999999999999999999"
    let dataString = ""
    let ctrK = 0

    for (let ctrJ = 1; ctrJ <= 50; ctrJ++) {
      // I'm not sure about the equivalent of "get ("i" & ctrJ)" in your context,
      // so I've commented it out. You might need to replace this with appropriate logic.
      // get ("i" & ctrJ);
      // const fieldText = (text of field (It) of page "Start");
      // Using dummy value for fieldText for now
      const fieldText = "9"

      dataString += fieldText.charAt(0) === "9" ? "9" : fieldText
      if (dataString.charAt(dataString.length - 1) !== "9") {
        ctrK++
      }
      if (ctrJ % 10 === 0) {
        this.gIsValidAE[ctrJ / 10] = !(ctrK < minValidItems)
        ctrK = 0
      }
    }

    switch (this.gUseItemSubset) {
      case "A":
        if (this.gIsValidAE[1])
          this.gRawItemScoreString =
            dataString.substring(0, 10) + nineString.substring(0, 40)
        break
      case "B":
        if (this.gIsValidAE[2])
          this.gRawItemScoreString =
            nineString.substring(0, 10) +
            dataString.substring(10, 10) +
            nineString.substring(0, 30)
        break
      case "C":
        if (this.gIsValidAE[3])
          this.gRawItemScoreString =
            nineString.substring(0, 20) +
            dataString.substring(20, 10) +
            nineString.substring(0, 20)
        break
      case "D":
        if (this.gIsValidAE[4])
          this.gRawItemScoreString =
            nineString.substring(0, 30) +
            dataString.substring(30, 10) +
            nineString.substring(0, 10)
        break
      case "E":
        if (this.gIsValidAE[5])
          this.gRawItemScoreString =
            nineString.substring(0, 40) + dataString.substring(40, 10)
        break
      default:
        this.gRawItemScoreString = dataString
    }

    this.gCalculateDebugOutput = "Beregner... vent litt..."

    // Not sure about the exact translation of "send wrapMainCalculate to self",
    // so commenting it out for now. You might need to replace this with appropriate logic.
    // this.wrapMainCalculate();

    switch (this.gResult) {
      case -10001:
        console.error("Kunne ikke beregne samleskåren.  Ingen gyldige data.")
        break
      case -10002:
        console.error(
          "Kunne ikke beregne samleskåren.  Beregningen konvergerte ikke etter " +
            this.gNValid +
            " iterasjoner."
        )
        break
      case -10000:
        break // normal termination
      default:
        console.error(
          "Kunne ikke beregne samleskåren.  Uventet feil i programmet.  Beklager!"
        )
    }

    if (this.gNValid < minValidItems) {
      console.error(
        "Kan ikke beregne samleskåren hvis færre enn " +
          minValidItems +
          " er fylt ut."
      )
    }
  }
}
