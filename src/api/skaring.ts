export class Skaring {
  // SECTION "-- ***************** INITIALIZATION ************************""

  // System configurations
  sysDateFormat: string;
  sysDecimal: string;
  sysList: string;

  // Global variables
  currentFile: string | null;
  currentFileIsSaved: boolean;
  svShowRasch: boolean;

  // Other global variables
  gResult: number;
  gCalculateDebugOutput: string;
  gCalculateDebugCurrentState: string;
  gMeasure: number;
  gSE: number;
  gNValid: number;
  gIsMinEstimated: boolean;
  gIsMaxEstimated: boolean;
  gConvertParameter1: number;
  gConvertParameter2: number;
  gMinEstAge: number;
  gMaxEstAge: number;
  gRawItemScoreString: string;
  gUseItemSubset: string;
  gIsValidAE: boolean[];
  gAlder: number;
  gModelPercentiles: number[][];
  gAgeGroupLabels: string[];
  gAgeGroupThresholds: number[][];
  gItemLabels: string[];
  versionString: string;
  aItemDifficulties: number[];

  constructor() {
    // System configurations
    this.sysDateFormat = "dd.mm.yyyy";
    this.sysDecimal = ".";
    this.sysList = ",";

    // Global variables
    this.currentFile = null;
    this.currentFileIsSaved = true;
    this.svShowRasch = false;

    // Other global variables
    this.gResult = 0;
    this.gCalculateDebugOutput = "";
    this.gCalculateDebugCurrentState = "Initialized.";
    this.gMeasure = -9999;
    this.gSE = -9999;
    this.gNValid = 0;
    this.gIsMinEstimated = true;
    this.gIsMaxEstimated = true;
    this.gConvertParameter1 = 1.968;
    this.gConvertParameter2 = 0.254;
    this.gMinEstAge = 3.5;
    this.gMaxEstAge = 18;
    this.gRawItemScoreString =
      "99999999999999999999999999999999999999999999999999";
    this.gUseItemSubset = "All";
    this.gIsValidAE = [false, false, false, false, false];
    this.gAlder = -9999;
    this.versionString = "NUBUMotor_101";

    this.aItemDifficulties = [
      -1.94, -1.38, -1.22, -0.68, -0.15, -0.36, 0.43, 1.27, 2.24, 2.06, -2.76,
      -1.7, -1.02, -0.8, -0.29, 0.37, 1.05, 1.33, 1.61, 2.23, -2.54, -2.33,
      -1.72, -1.59, -1.35, -0.08, -0.37, 1.6, 1.49, 1.49, -2.82, -1.89, -0.83,
      -0.22, -0.26, -0.12, 1.31, 1.62, 1.93, 2.4, -1.54, -1.43, -1.04, 0.21,
      0.89, 1.19, 1.25, 1.34, 1.19, 1.94,
    ];

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
    ];

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
    ];

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
    ];

    // Item Labels
    this.gItemLabels = Array("ABCDE".length).reduce(
      (accumulator, currLetter) => {
        accumulator = [
          ...accumulator,
          ...Array(10)
            .fill(0)
            .map((_, numberIndex) => currLetter + (numberIndex + 1).toString()),
        ];
      },
      []
    );

    // HARALD: MISSING USER-INTERFACE MAMIPULATION: THE INTERFACE SHOULD START DISPLAYING THE INPUT PAGE, AND THE STATE OF THE PAGE SHOULD BE LIKE
    // AFTER HAVING STARTED A NEW FILE (A NEW CASE), THUS THE INPUT FIELDS/DATA SHOULD BE BLANK. IN OPENSCRIPT THIS WAS ACHIEVED BY THE FOLLOWING CODE
    // WHICH SETS THE CURRENT PAGE TO THE "START" PAGE AND THEN CALLS THE SAME FUNCTION AS SELECTING "NEW FILE" FROM THE USER "FILE" MENU:
    // currentPage of mainWindow = page "Start" of self
    // send nyFil
  }

  // SECTION "-- ***************** PREPARATION OF OUTPUT ************************"

  prepareInputForOutput(argA: string): void {
    const minValidItems = 3;
    const nineString = "9999999999999999999999999999999999999999999999999999";
    let dataString = "";
    let ctrK = 0;

    for (let ctrJ = 1; ctrJ <= 50; ctrJ++) {
      // HARALD: HÄR HÄMTAS DET DATA.
      // "dataString" SKALL INNEHÅLLA 50 TECKEN OCH VART OCH ETT AV TECKNEN SKALL MOTSVARA (DET FÖRSTA) GILTIGA TECKNET
      // I MOTSVARANDE FÄLT NÄR DE TAS I ORDNINGEN a1, a2, ... a10, b1 ... b10, ... e10. OM FÄLTET INTE INNEHÅLLER
      // NÅGOT GILTIGT TECKEN ("0", "1" ELLER "2") SKALL MOTSVARANDE TECKEN I STRÄNGEN VARA "9"
      // I'm not sure about the equivalent of "get ("i" & ctrJ)" in your context,
      // so I've commented it out. You might need to replace this with appropriate logic.
      // get ("i" & ctrJ);
      // const fieldText = (text of field (It) of page "Start");
      // Using dummy value for fieldText for now
      const fieldText = "9";

      // HARALD: "fieldtext" I FÖLJANDE RAD BEHÖVER ÄNDRAS TILL ATT REFERERA TILL DATA:

      dataString += fieldText.charAt(0) === "9" ? "9" : fieldText;
      if (dataString.charAt(dataString.length - 1) !== "9") {
        ctrK++;
      }
      if (ctrJ % 10 === 0) {
        this.gIsValidAE[ctrJ / 10] = !(ctrK < minValidItems);
        ctrK = 0;
      }
    }

    switch (this.gUseItemSubset) {
      case "A":
        if (this.gIsValidAE[1])
          this.gRawItemScoreString =
            dataString.substring(0, 10) + nineString.substring(0, 40);
        break;
      case "B":
        if (this.gIsValidAE[2])
          this.gRawItemScoreString =
            nineString.substring(0, 10) +
            dataString.substring(10, 10) +
            nineString.substring(0, 30);
        break;
      case "C":
        if (this.gIsValidAE[3])
          this.gRawItemScoreString =
            nineString.substring(0, 20) +
            dataString.substring(20, 10) +
            nineString.substring(0, 20);
        break;
      case "D":
        if (this.gIsValidAE[4])
          this.gRawItemScoreString =
            nineString.substring(0, 30) +
            dataString.substring(30, 10) +
            nineString.substring(0, 10);
        break;
      case "E":
        if (this.gIsValidAE[5])
          this.gRawItemScoreString =
            nineString.substring(0, 40) + dataString.substring(40, 10);
        break;
      default:
        this.gRawItemScoreString = dataString;
    }

    this.gCalculateDebugOutput = "Beregner... vent litt...";

    // HARALD: This is where calculation takes place: wrapMainCalculate() calls raschMeasureFromItems, the main calculating function.
    this.wrapMainCalculate();

    switch (this.gResult) {
      case -10001:
        this.hj_error("Kunne ikke beregne samleskåren.  Ingen gyldige data.");
        break;
      case -10002:
        this.hj_error(
          "Kunne ikke beregne samleskåren.  Beregningen konvergerte ikke etter " +
            this.gNValid +
            " iterasjoner."
        );
        break;
      case -10000:
        break; // normal termination
      default:
        this.hj_error(
          "Kunne ikke beregne samleskåren.  Uventet feil i programmet.  Beklager!"
        );
    }

    if (this.gNValid < minValidItems) {
      this.hj_error(
        "Kan ikke beregne samleskåren hvis færre enn " +
          minValidItems +
          " er fylt ut."
      );
    }
  }

  aldersgruppepersentilerFraEstimat(theIn: number): string {
    // The function aldersgruppepersentilerFraEstimat in OpenScript seems to determine the age group percentiles
    // based on the input value theIn. The function maps theIn to one of four categories (1 to 4) for each age
    // group label. Finally, it constructs and returns a string output showing which category the input belongs to
    // for each age group label.
    const whatGroup: number[] = [];

    for (let ctrJ = this.gAgeGroupLabels.length - 1; ctrJ >= 0; ctrJ--) {
      if (theIn <= this.gAgeGroupThresholds[ctrJ][0]) {
        whatGroup[ctrJ] = 1;
      } else if (theIn <= this.gAgeGroupThresholds[ctrJ][1]) {
        whatGroup[ctrJ] = 2;
      } else if (theIn <= this.gAgeGroupThresholds[ctrJ][2]) {
        whatGroup[ctrJ] = 3;
      } else {
        whatGroup[ctrJ] = 4;
      }
    }

    // Construct text output
    let output: string[] = [];
    const strlen = [17, 12, 12, 12, 12];
    output.push(
      this.LText("Aldersgruppe", strlen[0]) +
        this.CText("-15.", strlen[1]) +
        this.CText(">15.-50.", strlen[2]) +
        this.CText(">50.-85.", strlen[3]) +
        this.CText(">85.", strlen[4])
    );

    output.push(
      this.LText("========================", strlen[0]) +
        this.RText("========================", strlen[1] - 1) +
        this.RText("========================", strlen[2] - 1) +
        this.RText("========================", strlen[3] - 1) +
        this.RText("========================", strlen[4] - 1)
    );

    for (let ctrJ = 0; ctrJ < this.gAgeGroupLabels.length; ctrJ++) {
      let line = this.LText(this.gAgeGroupLabels[ctrJ], strlen[0]);
      for (let i = 1; i <= 4; i++) {
        if (whatGroup[ctrJ] === i) {
          line += this.CText("X", strlen[i]);
        } else {
          line += this.LText("", strlen[i]);
        }
      }
      output.push(line);
    }

    return (
      "\n" +
      this.LText("", strlen[0]) +
      this.CText(
        "- - - - - - Faktisk persentil i referansegruppen - - - - - -",
        strlen[1] + strlen[2] + strlen[3] + strlen[4]
      ) +
      "\n" +
      output.join("\n") +
      "\n"
    );
  }

  // SECTION "-- ***************** OUTPUT DISPLAY AND MANIPULATION ************************"

  // HARALD: THIS SECTION CONTAINS SCRIPTS THAT PRODUCE, DISPLAY, AND MANIPULATE THE OUTPUT GRAPHIC(S).

  // HARALD: THE SCRIPTS THAT HAVE BEEN INSERTED BELOW MANIPULATE THE OUTPUT DISPLAY.
  // HOWEVER, SEVERAL SCRIPTS THAT TAKE USER INPUT (VIA MENU CHOICES), SET SYSTEM VARIABLES THAT
  // MODIFY THE OUTPUT, OPENS/CLOSES THE OUTPUT WINDOW, AND CALLS THE SETGRAPH FUNCTION BELOW, HAVE NOT
  // BEEN TRANSLATED, AS THEY SEEM VERY SPECIFIC TO TOOLBOOK AND NEED TO BE REPLACED WITH THE
  // CORRESPONDING FUNCTIONALITY. THE NON-TRANSLATED FUNCTIONS ARE:
  //
  // openPrintPreview // opens the output window/display, and calls the prepareInputForOutput function
  //
  // closePrintPreview // closes the output window
  //
  // printResults // sends the graphic output display to the predefined system printer, that is,
  // prints the output that is displayed in the output window. (The program also had the functionality
  // to print the output without previewing it first, so this function could be called from the input
  // window)
  //
  // toggleShowRasch // toggled the "Vise Rasch-skår" option - setting the svShowRash system variable,
  // and adjusted the corresponding menu choice accordingly
  //
  // adjustShowRasch // not to be confused with the previous; this function got the value of svShowRash
  // system variable, and adjusted the corresponding menu choice accordingly. (This function could be
  // called by the program to adjust the menu choices, without user input.)
  //
  // The following functions set the options for what data were used for generating the output. The
  // options were "All data", "Only A items", "Only B items", "Only D items", and "Only E items". When
  // any of these functions were called, the corresponding value of the system variable gUseItemSubset
  // was set, and the menu choices were adjusted (displayed) accordingly. The fact that these were
  // six different functions was due to the fact that separate menu commands were issued by menu choices,
  // so each needed its own script to capture the menu event.
  // calcAll // "All"
  // calcA // "A"
  // calcB // "B"
  // calcC // "C"
  // calcD // "D"
  // calcE // "E"
  //
  // toggleCalcAE // not to be confused with the functions above! This function checked if the data was
  // valid for displaying separate results for areas A, B, C, D, and E, respectively, and manipulated
  // the corresponding menu items in the output display menu. If an area was available, the respective
  // menu item was enabled (displayed in black, and clickable/selectable), but if the area was not
  // available, the menu item was disabled (displayed in gray, not clickable/selectable). This was
  // determined by means of the system variable gIsValidAE[5], that had five boolean values corresponding
  // to the five areas. (This system variable was defined elsewhere in preparing the output.) (This function could be
  // called by the program to adjust the menu choices, without user input.)
  //

  // HARALD: FOR THE "redrawAll" SCRIPT TO WORK, THE FOLLOWING FUNCTIONS NEED TO BE DEFINED. I AM GIVING
  // DEFINITIONS AND THE OPENSCRIPT CONTENTS - MUST WRITE TYPESCRIPT FUNCTIONS THAT MANIPULATE OUTPUT
  // GRAPHIC ELEMENTS IN THE SAME WAY.
  setFieldText(fieldName: string, newText: string): void {
    //text of field (fieldName) of page "PrintPage1"  = newText
  }
  setFieldPosition(
    fieldName: string,
    newPosition: { x: number; y: number }
  ): void {
    // position of field (fieldName) of page "PrintPage1"  = newPosition;
  }
  setFieldVisibility(fieldName: string, isVisible: boolean): void {
    // visible of field (fieldName) of page "PrintPage1"  = isVisible
  }
  setFieldVertices(
    fieldName: string,
    newVertices: { x1: number; y1: number; x2: number; y2: number }
  ): void {
    //vertices of field (fieldName) of page "PrintPage1"  = newVertices
  }
  setFieldStrokeColor(fieldName: string, newColor: string): void {
    // HARALD: NOTE: PARAMETER "NEWCOLOR" TAKES A COLOR CONSTANT LIKE "black" OR "lightGray" IN OPENSCRIPT
    // strokeColor of field (fieldName) of page "PrintPage1"  = newColor
  }
  setLastWordBold(fieldName: string, isBold: boolean): void {
    if (isBold === true) {
      //fontStyle of last word of text of field (fieldName) of page "PrintPage1" = bold
    } else {
      //fontStyle of last word of text of field (fieldName) of page "PrintPage1" = regular
    }
  }
  setLinePosition(
    lineName: string,
    newPosition: { x: number; y: number }
  ): void {
    // position of line (lineName) of page "PrintPage1"  = newPosition
  }
  setLineVertices(
    lineName: string,
    newVertices: { x1: number; y1: number; x2: number; y2: number }
  ): void {
    // vertices of line (lineName) of page "PrintPage1"  = newVertices
  }
  setLineVisibility(lineName: string, isVisible: boolean): void {
    // visible of line (lineName) of page "PrintPage1"  = isVisible; return 1
  }

  setRectangleVertices(
    rectangleName: string,
    newVertices: { x1: number; y1: number; x2: number; y2: number }
  ): void {
    // vertices of rectangle (rectangleName) of page "PrintPage1"  = newVertices; return 1
  }
  setRectangleVisibility(rectangleName: string, isVisible: boolean): void {
    // visible of rectangle (rectangleName) of page "PrintPage1"  = isVisible; return 1
  }

  setGraph(redrawAll: number): void {
    // This is the script that manipulates the objects on the output page
    let minage: number, maxage: number, minMeasure: number, maxMeasure: number;
    let maxPU: number, minPU: number, leftPU: number, rightPU: number;
    let maxPT: number, minPT: number, leftPT: number, rightPT: number;
    const promptoffset: number = 100;

    let showRaschMeasure: boolean;
    // HARALD: This has been simplified. In OpenScript, I checked if "sysLevel" was "reader", i.e.
    // if the program was running/executing. If not, I set showRaschMeasure to "true" anyway. Here,
    // I am assuming that the program is running.
    showRaschMeasure = this.svShowRasch;

    // These next lines were static assignments in the original script.
    // I'm interpreting them as fixed assignments here.
    // The first assignment should be to the coordinates of the object "rectangleGraph" in the
    // output display. The point is that by getting the coordinates, all other elements can be
    // properly adjusted.
    // In OpenScript, the dynamic assignment was:
    // get vertices of rectangle "Graph1" of page "PrintPage1"
    let rectangleGraph = { x1: 1692, y1: 8262, x2: 2400, y2: 13977 };

    // HARALD: Similarly, the point of the next assignment is to get the rectangle coordinates
    // for proper adjustment of text fields. In OpenScript, the corresponding dynamic statement
    // was:
    // get vertices of rectangle "TextAlignField" of page "PrintPage1"
    let rectangleTextAlign = { x1: 3108, y1: 8262, x2: 8460, y2: 13977 };

    maxPU = rectangleGraph.y1;
    minPU = rectangleGraph.y2;
    leftPU = rectangleGraph.x1;
    rightPU = rectangleGraph.x2;

    maxPT = rectangleTextAlign.y1;
    minPT = rectangleTextAlign.y2;
    leftPT = rectangleTextAlign.x1;
    rightPT = rectangleTextAlign.x2;

    minage = this.gMinEstAge;
    maxage = this.gMaxEstAge;
    minMeasure = this.ageToMeasure(
      minage,
      this.gConvertParameter1,
      this.gConvertParameter2
    );
    maxMeasure = this.ageToMeasure(
      maxage,
      this.gConvertParameter1,
      this.gConvertParameter2
    );

    const ageLinesMeasure = [
      -4.0, -3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0,
      2.5, 3.0, 3.5, 4.0,
    ];
    const ageLines = [3.5, 4.0, 4.5, 5.0, 5.5, 6, 7, 8, 9, 10, 12, 14, 16, 18];
    const agePrompts = [
      "3:6",
      "4:0",
      "4:6",
      "5:0",
      "5:6",
      "6:0",
      "7:0",
      "8:0",
      "9:0",
      "10:0",
      "12:0",
      "14:0",
      "16:0",
      "18:0",
    ];

    if (redrawAll !== 0) {
      // Note: The case "redrawAll" !== 0" does not happen triggered by code. It can be called by the
      // developer to adjust all the positions and other properties that are called. Among other things,
      // this should align the positions and sizes of fields, lines and rectangles to fit with the
      // bounds of the rectangles defined above. It might be handy. Note that after running this,
      // some item information fields will be on top of each other or too close to each other. Those
      // must be adjusted manually.
      // Depending on how we build the graphic output elements, we may not want to
      // use this part at all!.

      // Sets prompts texts
      // HARALD: In the following, we really need to know the height of each field item_1 to item_50 to preserve
      // field height. For now, I am just setting the field height to the constant of 192 which was the
      // OpenScript/ToolBook height of field item_1 as well as of field item_50.
      const localFieldHeight = 192;
      for (let ctrJ = 0; ctrJ < 50; ctrJ++) {
        this.setFieldText("item_" + (ctrJ + 1), this.gItemLabels[ctrJ]);
        const fieldPos = {
          x: Math.trunc((ctrJ - 0.5) / 10) * 0.2 * (rightPT - leftPT) + leftPT,
          y:
            this.YPUFromMeasure(
              this.aItemDifficulties[ctrJ],
              minMeasure,
              maxMeasure,
              maxPT,
              minPT
            ) -
            localFieldHeight / 2,
        };
        this.setFieldPosition("item_" + (ctrJ + 1), fieldPos);
      }

      for (let ctrJ = 0; ctrJ < ageLines.length; ctrJ++) {
        if (ageLines[ctrJ] >= minage && ageLines[ctrJ] <= maxage) {
          this.setLineVisibility("ageline" + (ctrJ + 1), true);
          this.setFieldVisibility("ageprompt" + (ctrJ + 1), true);

          const lineVertices = {
            x1: leftPU,
            y1: this.YPUFromMeasure(
              this.ageToMeasure(
                ageLines[ctrJ],
                this.gConvertParameter1,
                this.gConvertParameter2
              ),
              minMeasure,
              maxMeasure,
              maxPU,
              minPU
            ),
            x2: rightPU,
            y2: this.YPUFromMeasure(
              this.ageToMeasure(
                ageLines[ctrJ],
                this.gConvertParameter1,
                this.gConvertParameter2
              ),
              minMeasure,
              maxMeasure,
              maxPU,
              minPU
            ),
          };
          this.setLineVertices("ageline" + (ctrJ + 1), lineVertices);
          // HARALD: In the next lines, I really wanted to dynamically get the width of the
          // ageprompt fields (there are 13 or so of them). For now, I am just setting the
          // width to 708, which was the OpenScript/ToolBook width.
          const localFieldwidth = 708;
          const fieldPos = {
            x: leftPU - localFieldwidth - promptoffset,
            y: this.YPUFromMeasure(
              this.ageToMeasure(
                ageLines[ctrJ],
                this.gConvertParameter1,
                this.gConvertParameter2
              ),
              minMeasure,
              maxMeasure,
              maxPU,
              minPU
            ),
          };
          this.setFieldPosition("ageprompt" + (ctrJ + 1), fieldPos);

          this.setFieldText("ageprompt" + (ctrJ + 1), agePrompts[ctrJ]);
        } else {
          this.setLineVisibility("ageline" + (ctrJ + 1), false);
          this.setFieldVisibility("ageprompt" + (ctrJ + 1), false);
        }
      }

      for (let ctrJ = 0; ctrJ < ageLinesMeasure.length; ctrJ++) {
        if (
          ageLinesMeasure[ctrJ] >= minMeasure &&
          ageLinesMeasure[ctrJ] <= maxMeasure
        ) {
          // repositions and shows tick lines and measure prompts if measure is within min and max measure range.
          let fieldPos = {
            x: rightPU,
            y: this.YPUFromMeasure(
              ageLinesMeasure[ctrJ],
              minMeasure,
              maxMeasure,
              maxPU,
              minPU
            ),
          };
          this.setLinePosition("measureTick" + (ctrJ + 1), fieldPos);
          this.setLineVisibility("measureTick" + (ctrJ + 1), true);
          // HARALD: In the next lines, I really wanted to dynamically get the width of the
          // measureprompt fields (there are 17 or so of them). For now, I am just setting the
          // width to 350, which was the OpenScript/ToolBook width.
          // Similarly, setting the height to 228.
          const localFieldwidth = 350;
          const localFieldHeight = 228;
          fieldPos = {
            x: rightPU + localFieldwidth,
            y:
              this.YPUFromMeasure(
                ageLinesMeasure[ctrJ],
                minMeasure,
                maxMeasure,
                maxPU,
                minPU
              ) - localFieldHeight,
          };
          this.setFieldPosition("measureprompt" + (ctrJ + 1), fieldPos);
          this.setFieldVisibility("measureprompt" + (ctrJ + 1), true);
          this.setFieldText(
            "measureprompt" + (ctrJ + 1),
            "" + ageLinesMeasure[ctrJ]
          );
        } else {
          // hides tick lines and measure prompts if out of min and max measure range.
          this.setLineVisibility("measureTick" + (ctrJ + 1), false);
          this.setFieldVisibility("measureprompt" + (ctrJ + 1), false);
        }
      }
      // End of "redrawAll" clause.
    }

    // Here begins the normal redraw of elements, which occurs every time the output display is
    // readjusted. The following code manipulates the visibility of the Rasch
    // scale ticks and prompts, the item information fields, the estimate line, and the
    // confidence interval rectangle.
    if (showRaschMeasure) {
      for (let ctrJ = 0; ctrJ < ageLinesMeasure.length; ctrJ++) {
        if (
          ageLinesMeasure[ctrJ] >= minMeasure &&
          ageLinesMeasure[ctrJ] <= maxMeasure
        ) {
          this.setFieldVisibility("measureprompt" + (ctrJ + 1), true);
          this.setLineVisibility("measureTick" + (ctrJ + 1), true);
        }
      }
      this.setFieldVisibility("measureprompt_", true);
    } else {
      for (let ctrJ = 0; ctrJ < ageLinesMeasure.length; ctrJ++) {
        this.setFieldVisibility("measureprompt" + (ctrJ + 1), false);
        this.setLineVisibility("measureTick" + (ctrJ + 1), false);
      }
      this.setFieldVisibility("measureprompt_", false);
    }

    // information fields
    // HARALD: Here, we need to get the data for the fields "navn" and "alder". I am
    // putting text constants into local variables for now; this should be changed to actual data.
    let navn_value = "Ola Normann";
    let alder_value = "5:1";
    this.setFieldText("navn", navn_value);
    this.setFieldText("alder", alder_value);
    // HARALD: Likewise, we need to get the data for the "gutt" and "jente" choices.
    // (They are two boolean values. Both can be false, but only one or the other can be true.)
    // I am setting the value into local variables for now. Need to fill with actual data.
    let gutt_value: boolean;
    gutt_value = true;
    let jente_value: boolean;
    jente_value = false;

    if (gutt_value === true) {
      this.setFieldText("led_kjonn", "Kjønn:\tGutt");
    } else {
      if (jente_value === false) {
        this.setFieldText("led_kjonn", "");
      } else {
        this.setFieldText("led_kjonn", "Kjønn:\tJente");
      }
    }

    // estimate line
    if (this.gMeasure !== -9999) {
      const estimateLineVertices = {
        x1: leftPU,
        y1: this.YPUFromMeasure(
          this.gMeasure,
          minMeasure,
          maxMeasure,
          maxPU,
          minPU
        ),
        x2: rightPT,
        y2: this.YPUFromMeasure(
          this.gMeasure,
          minMeasure,
          maxMeasure,
          maxPU,
          minPU
        ),
      };
      this.setLineVertices("estimateline", estimateLineVertices);
      this.setLineVisibility("estimateline", true);
    } else {
      this.setLineVisibility("estimateline", false);
    }

    // confidence interval rectangle
    if (this.gSE !== -9999 && !this.gIsMinEstimated && !this.gIsMaxEstimated) {
      const ciRectangleVertices = {
        x1: leftPU,
        y1: this.YPUFromMeasure(
          this.gMeasure + 1.96 * this.gSE,
          minMeasure,
          maxMeasure,
          maxPU,
          minPU
        ),
        x2: rightPU,
        y2: this.YPUFromMeasure(
          this.gMeasure - 1.96 * this.gSE,
          minMeasure,
          maxMeasure,
          maxPU,
          minPU
        ),
      };
      this.setRectangleVertices("CI", ciRectangleVertices);
      this.setRectangleVisibility("CI", true);
    } else {
      this.setRectangleVisibility("CI", false);
    }

    // item information fields
    for (let ctrJ = 0; ctrJ < 50; ctrJ++) {
      if ("012".indexOf(this.gRawItemScoreString[ctrJ]) === -1) {
        this.setFieldText("item_" + (ctrJ + 1), this.gItemLabels[ctrJ]);
        this.setFieldStrokeColor("item_" + (ctrJ + 1), "lightGray");
      } else {
        this.setFieldText(
          "item_" + (ctrJ + 1),
          this.gItemLabels[ctrJ] + " (" + this.gRawItemScoreString[ctrJ] + ")"
        );
        this.setFieldStrokeColor("item_" + (ctrJ + 1), "black");
        this.setLastWordBold("item_" + (ctrJ + 1), true);
      }
    }

    // text field with numeric results
    // ... [Additional code that builds a text output and manipulates graphical elements.]

    let vOutput: string = "";

    switch (this.gUseItemSubset) {
      case "A":
        vOutput +=
          "================ Beregnet bare ut fra A-oppgaver ================\n\n";
        break;
      case "B":
        vOutput +=
          "================ Beregnet bare ut fra B-oppgaver ================\n\n";
        break;
      case "C":
        vOutput +=
          "================ Beregnet bare ut fra C-oppgaver ================\n\n";
        break;
      case "D":
        vOutput +=
          "================ Beregnet bare ut fra D-oppgaver ================\n\n";
        break;
      case "E":
        vOutput +=
          "================ Beregnet bare ut fra E-oppgaver ================\n\n";
        break;
      default:
        vOutput +=
          "=================================================================\n";
    }

    vOutput +=
      "Samleskår (Aldersekvivalent):    " +
      this.estimateToPresentText(this.gMeasure) +
      "\n\n";

    if (this.gSE !== -9999 && !this.gIsMinEstimated && !this.gIsMaxEstimated) {
      vOutput +=
        "95% konfidensintervall fra:      " +
        this.estimateToPresentText(this.gMeasure - 1.96 * this.gSE) +
        "\n";
      vOutput +=
        "                       til:      " +
        this.estimateToPresentText(this.gMeasure + 1.96 * this.gSE) +
        "\n\n";
    } else {
      if (this.gIsMinEstimated) {
        vOutput +=
          "Alle oppgaver er skåret 0. Konfidensintervall kan ikke beregnes.\n\n";
      } else if (this.gIsMaxEstimated) {
        vOutput +=
          "Alle oppgaver er skåret 2. Konfidensintervall kan ikke beregnes.\n\n";
      } else {
        vOutput += "Konfidensintervall kan ikke beregnes.\n\n";
      }
    }

    if (this.gAlder !== -9999) {
      // HARALD: Note. The constant "alder_value" below, which contains the display value of the
      // input data field "alder", should be changed to display dynamically the data of the
      // data field "alder".
      vOutput +=
        "Skåren tilsvarer " +
        this.modellpersentilFraEstimat(
          this.gMeasure -
            this.ageToMeasure(
              this.gAlder,
              this.gConvertParameter1,
              this.gConvertParameter2
            )
        ) +
        ". persentilen av barn på alderen " +
        alder_value +
        " basert på\n" +
        "den statistiske modellen.\n\n";
    } else {
      vOutput += "Persentil basert på statistisk modell kan ikke beregnes.\n\n";
    }

    vOutput +=
      "=================================================================\n" +
      this.aldersgruppepersentilerFraEstimat(this.gMeasure);

    if (showRaschMeasure) {
      vOutput +=
        "=================================================================\n";
      vOutput +=
        "Samleskår (Rasch-skår)    :     " + this.gMeasure.toFixed(2) + "\n";

      if (
        this.gSE !== -9999 &&
        !this.gIsMinEstimated &&
        !this.gIsMaxEstimated
      ) {
        vOutput +=
          "Standardfeil              :     " + this.gSE.toFixed(2) + "\n";
      } else {
        vOutput += "Standardfeil for skåren kan ikke beregnes.\n";
      }
    }

    vOutput +=
      "=================================================================\n";
    this.setFieldText("output", vOutput);
  }

  // SECTION "-- ***************** FILE READING AND WRITING ************************"

  // SECTION "-- ***************** CALCULATION AND VARIABLE MANIPULATION ************************"

  wrapMainCalculate() {
    // -- This is a wraparound command to run the raschMeasureFromItems function.
    // -- It evaluates the result and puts it into the relevant variables.
    this.gCalculateDebugOutput = "";
    const result = this.raschMeasureFromItems(this.gRawItemScoreString);

    if (typeof result === "number") {
      this.gResult = result;
    } else {
      this.gResult = -10003;
    }

    this.gCalculateDebugOutput += `\n\nResult= ${result}`;
    if (result === -10000) {
      this.gCalculateDebugCurrentState = "Normal termination.";
    } else {
      this.gCalculateDebugCurrentState = `Did not terminate normally. Result= ${result}.`;
    }
  }

  raschMeasureFromItems(responseString: string): number {
    // -- This is the main calculation script that calculates Rasch scale value and standard error estimate.
    // -- The script returns a result parameter that is -10000 if successful.
    // -- ==============================================================================
    // -- If successful will put measure and SE, number of valid items, whether
    // -- maximum or minimum estimated,
    // -- in appropriate system variables.

    const keyString = "012";
    const nofItems = 50;
    const nofCats = 3;
    const aCatDifficulties: number[] = "0,-.39,.39".split(",").map(parseFloat);
    const maxIterations = 500;
    const convergence = 0.001;
    const thisItemCompleted: boolean[] = new Array(nofItems).fill(false);

    // 	-- ==============================================================================
    //	-- Step 1. Collect responses by person n to the desired
    //	-- subset of L calibrated polytomous or dichotomous items.
    //	-- Person n has a raw score of R.
    //	-- RMin is the minimum possible score on these items,
    //	-- RMax the maximum possible.
    //
    //	-- Step 3.
    //	-- The average item difficulty of person n's L items is
    //  -- Dmean = (1/L)* Sum[from i=1 to L]of Di

    let nofCompletedItems = 0;
    let rawScore = 0;
    let dMean = 0;
    let rMin = 0;
    // HARALD: This does not seem to be right. rMax cannot be defined until the completed items have been parsed.
    // I moved it to below, the place corresponding to the same place in the OpenScript version.
    // let rMax = nofItems * (nofCats - 1);
    this.gMeasure - 9999;
    this.gSE = -9999;
    this.gNValid = 0;
    this.gIsMinEstimated = true;
    this.gIsMaxEstimated = true;

    for (let i = 0; i < nofItems; i++) {
      // HARALD: For the next line, I reverted back to calling a function instead of using .indexOf
      const charIndex = this.getNumRawScore(
        responseString[i],
        keyString,
        nofCats
      );
      // HARALD: Line above was translated to: const charIndex = keyString.indexOf(responseString[i]);
      // HARALD: I changed back the comparating character from "!==" to ">" in the next line.
      if (charIndex > -1) {
        thisItemCompleted[i] = true;
        nofCompletedItems++;
        rawScore += charIndex;
        dMean += this.aItemDifficulties[i];
      }
    }

    this.gNValid = nofCompletedItems;
    if (nofCompletedItems === 0) {
      return -10001;
    }

    // HARALD: I RE-IMPLEMENTED DEFINITION OF RMAX HERE, CORRESPONDING TO THE OPENSCRIPT VERSION.
    let rMax = nofCompletedItems * (nofCats - 1);
    dMean = dMean / nofCompletedItems;

    if (rawScore === rMin) {
      this.gIsMinEstimated = true;
      rawScore = rMin + 0.3;
    }

    if (rawScore === rMax) {
      this.gIsMaxEstimated = true;
      rawScore = rMax - 0.3;
    }

    // -- ==============================================================================

    // -- Step 2. Each item i has a calibration Di and each step j a calibration Fj, in
    // -- user-scaled units. If not already in logits, convert these to logits
    // -- (Here it is assumed that all calibrations are in logits.)

    // -- Step 3 is performed above.

    // -- ==============================================================================

    // -- Step 4. The initial estimate of person n's ability can be any finite value.
    // -- Convenient ones are the mean item difficulty, a previous ability estimate,
    // -- or M=dMean+ln((rawScore-rMin)/(rMax-rawScore))

    let oldM = dMean + Math.log((rawScore - rMin) / (rMax - rawScore));

    // HARALD: INSERTED DEBUGTEXTGENERATION.
    this.gCalculateDebugOutput =
      this.gCalculateDebugOutput +
      "\n\n" +
      "rawScore      = " +
      rawScore +
      "\n" +
      "dMean         = " +
      dMean +
      "\n";

    // -- ==============================================================================

    // -- Step 5. Compute expected score and variance for M. The categories for item i
    // -- of difficulty Di are numbered b, ..., t. Fb=0, and the other Fk are the
    // -- Rasch-Andrich step thresholds. The denominator is the sum o fhe numerators
    // -- for all categories, so that the sum of the probabilities across all categories
    // -- is 1:

    let newM: number = 0;
    let expectedScoreVariance: number = 0;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let expectedScore = 0;

      // HARALD: HAS REINSERTED PRINTING ITERATIONS FOR DEBUGGING PURPOSES.
      //     -- Prints iterations for debugging purposes.
      this.gCalculateDebugOutput =
        this.gCalculateDebugOutput +
        "\n" +
        "---- ITERATION " +
        iteration +
        " ----" +
        "\n";

      this.gCalculateDebugCurrentState =
        this.gCalculateDebugCurrentState + "ITERATION " + iteration;

      for (let i = 0; i < nofItems; i++) {
        //        --skips if item not completed
        if (!thisItemCompleted[i]) continue;

        let denomPnij = 0;
        for (let h = 0; h < nofCats; h++) {
          let partDenomPnij = 0;
          for (let k = 0; k <= h; k++) {
            partDenomPnij += aCatDifficulties[k];
          }
          denomPnij += Math.exp(
            h * (oldM - this.aItemDifficulties[i]) - partDenomPnij
          );
        }

        let expectedScoreVariance1 = 0;
        let expectedScoreVariance2 = 0;

        for (let j = 0; j < nofCats; j++) {
          let enumPnij = 0;
          for (let k = 0; k <= j; k++) {
            enumPnij += aCatDifficulties[k];
          }
          const Pnij =
            Math.exp(j * (oldM - this.aItemDifficulties[i]) - enumPnij) /
            denomPnij;
          expectedScore += j * Pnij;
          expectedScoreVariance1 += j ** 2 * Pnij;
          expectedScoreVariance2 += j * Pnij;
        }

        expectedScoreVariance +=
          expectedScoreVariance1 - expectedScoreVariance2 ** 2;
      }

      // HARALD: I HAVE REINSERTED DEBUG-OUTPUT-WRITING.
      this.gCalculateDebugOutput =
        this.gCalculateDebugOutput +
        "\n\n" +
        "oldM          = " +
        oldM +
        "\n" +
        "expectedScore = " +
        expectedScore +
        "\n" +
        "variance      = " +
        expectedScoreVariance +
        "\n";

      // -- ==============================================================================
      // -- Step 6. Obtain a better estimate M' of the measure M:

      newM = oldM + (rawScore - expectedScore) / expectedScoreVariance;
      if (Math.abs(newM - oldM) < convergence) {
        break;
      }
      // HARALD: Resinserted testing if maxiterations has been reached, this was removed in translation.
      if (iteration === maxIterations - 1) {
        // Maxiterations has been reached without convergence
        return -10002;
      }
      oldM = Math.max(Math.min(oldM + 1, newM), oldM - 1);
    }

    this.gMeasure = newM;
    this.gSE = 1 / Math.sqrt(expectedScoreVariance);

    // HARALD: Reinserted debug text generation.
    this.gCalculateDebugOutput =
      "\n\n" +
      "========== FINAL PERSON ESTIMATE ===========" +
      "\n" +
      "Rasch Ability Estimate = " +
      this.gMeasure +
      "Standard Error         = " +
      this.gSE +
      "\n\n" +
      this.gCalculateDebugOutput;

    return -10000;
  }

  modellpersentilFraEstimat(theIn: number): number {
    // The provided OpenScript function modellpersentilFraEstimat rounds the input value theIn to the
    // nearest multiple of 0.05 and then uses a two-dimensional array gModelPercentiles to return a
    // corresponding percentile value.
    theIn = Math.round(theIn * 20) / 20;

    const antallTabellrader = this.gModelPercentiles.length;

    if (theIn <= this.gModelPercentiles[0][0]) {
      return this.gModelPercentiles[0][1];
    }

    let ctrJ = 1;
    while (
      theIn > this.gModelPercentiles[ctrJ][0] &&
      ctrJ < antallTabellrader - 1
    ) {
      ctrJ++;
    }

    return this.gModelPercentiles[ctrJ][1];
  }

  LText(theIn: string, nofChars: number): string {
    // The given OpenScript function LText takes a string theIn and a number nofChars. It appends
    // 100 spaces to the end of theIn and then returns the first nofChars characters of the resulting
    // string.
    const paddedString =
      theIn +
      "                                                                                                    "; // 100 spaces
    return paddedString.substring(0, nofChars);
  }

  RText(theIn: string, nofChars: number): string {
    // Uses the slice method with a negative index to achieve the functionality of returning the last
    // (nofChars) characters from a string that contains the input string padded to the left with blanks.
    const paddedString =
      "                                                                                                    " +
      theIn; // 100 spaces
    return paddedString.slice(-nofChars);
  }

  CText(theIn: string, nofChars: number): string {
    // Uses the substring method with a calculated start index to achieve the functionality of extracting
    // a centered substring of nofChars length.
    const paddedString =
      "                                                  " +
      theIn +
      "                                                  "; // 50 spaces + theIn + 50 spaces
    const startIndex = Math.round((paddedString.length - nofChars) / 2);
    return paddedString.substring(startIndex, startIndex + nofChars);
  }

  hj_shortFileName(theIn: string): string {
    // Removes all characters from the beginning of the string theIn up to and including the last occurrence
    // of the character \. Essentially, it extracts the filename from a full file path.
    const lastSlashIndex = theIn.lastIndexOf("\\");
    if (lastSlashIndex !== -1) {
      return theIn.substring(lastSlashIndex + 1);
    }
    return theIn;
  }

  hj_Path(theIn: string): string {
    // This function removes characters from the end of the string theIn until it encounters the \ character,
    // effectively extracting the directory path from a full file path.
    while (theIn.charAt(theIn.length - 1) !== "\\") {
      theIn = theIn.slice(0, -1);
    }
    return theIn;
  }

  YPUFromMeasure(
    theIn: number,
    minMeasure: number,
    maxMeasure: number,
    maxPU: number,
    minPU: number
  ): number {
    // This function performs a linear transformation on the input value theIn, ensuring it is between minMeasure
    // and maxMeasure, and then maps it to a corresponding value between minPU and maxPU.

    // Ensure theIn is between minMeasure and maxMeasure
    theIn = Math.min(maxMeasure, Math.max(minMeasure, theIn));

    // Calculate the coordinate
    const output =
      minPU +
      ((theIn - minMeasure) / (maxMeasure - minMeasure)) * (maxPU - minPU);
    return output;
  }

  getNumRawScore(inChar: string, inString: string, nofCats: number): number {
    // loops through a string inString until it finds a character that matches inChar. When found, it returns
    // the index minus 1. If not found, it returns -1.
    // Because inString should contain valid category characters, the result is that an output of
    // 0 will represent the first valid category character,
    // 1 will represent the second valid category character,
    // and so on. The Rasch measure calculation requires categories to be numbered in this way.
    for (let ctrJ = 0; ctrJ < nofCats; ctrJ++) {
      if (inChar === inString.charAt(ctrJ)) {
        return ctrJ;
      }
    }
    return -1;
  }

  ageToMeasure(theIn: number, a: number, b: number): number {
    // Takes age as expressed as a number, and converts it to Rasch-measure metric
    return -1 * (a / b) + (1 / b) * Math.log(theIn);
  }

  yearDecToMonth(theIn: number): string {
    // Converts a decimal representation of a year to a "year:month" format.
    const vYear = Math.trunc(theIn);
    const vMonth = Math.trunc((theIn - vYear) * 12);
    return `${vYear}:${vMonth}`;
  }

  yearMonthToDec(theIn: string): number | null {
    // Converts a "year:month" format to a decimal representation.
    // uses string splitting and assumes the input format is always valid, which may not be the case.
    // Proper validation MAY be added.
    const parts = theIn.split(":");
    if (parts.length !== 2 || isNaN(+parts[0]) || isNaN(+parts[1])) {
      console.error(`Invalid input for yearMonthToDec: ${theIn}`);
      return null;
    }
    return +parts[0] + +parts[1] / 12 + 1 / 24;
  }

  // 5. estimateToPresentText
  // Assuming global variables for this function are declared and initialized outside

  estimateToPresentText(theIn: number): string {
    const ageEquivalent = Math.exp(
      this.gConvertParameter1 + this.gConvertParameter2 * theIn
    );
    if (ageEquivalent < this.gMinEstAge) {
      return "Lavere enn " + this.yearDecToMonth(this.gMinEstAge);
    } else if (ageEquivalent > this.gMaxEstAge) {
      return "Høyere enn " + this.yearDecToMonth(this.gMaxEstAge);
    } else {
      return this.yearDecToMonth(ageEquivalent);
    }
  }

  validDateSecondsFromNorwegian(theIn: string): number {
    // HARALD: THIS FUNCTION MUST BE TESTED! FOR ONE THING, IT IS NOTED THAT IT MAY NOT HAVE CONVERTED
    // COMPLETELY. FOR ANOTHER THING, IT SHOULD BE VALIDATED THAT TOOLBOOK "SECONDS" EQUALS GETTIME() MILLISECONDS
    // IN THIS FORMAT. ON THE OTHER HAND, THE FUNCTION MAY NOT BE IN USE IN THE PRESENT VERSION WITHOUT CALCULATION
    // OF AGE FROM BIRTHDAY TO TESTDATE.
    // This one is more tricky due to the different date formats and the conversion to seconds.
    // For simplicity, this function will convert date strings to Date objects and return their timestamps.
    // It does not handle every nuance of the original function, but it should give you a starting point.
    const currentDate = new Date();
    const thisYear = currentDate.getFullYear();
    const possibleFormats = [
      "D.M.",
      "DD.MM.",
      "D.M.YY",
      "DD.MM.YY",
      "D.M.YYYY",
      "DD.MM.YYYY",
    ];

    for (let format of possibleFormats) {
      const dateStr = format.includes("YY") ? theIn : `${theIn}${thisYear}`;
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.getTime() / 1000; // Convert milliseconds to seconds
      }
    }
    return -1;
  }

  // SECTION "-- ***************** GENERAL ERROR HANDLING ************************"

  hj_error(theIn: string): void {
    // A simple error handler that beeps, displays an error message, and then breaks the execution to system.
    // The beep functionality is replaced with a browser alert. The browser does not have a native beep functionality,
    // so the alert serves as a notification mechanism.
    // The browser's alert function is used for this purpose.
    alert(theIn); // Display a browser alert with the error message
    // The break to system line is translated to throwing an error in JavaScript/TypeScript, which will halt further
    // execution of the script (assuming it's not caught elsewhere).
    // Please note that this approach will stop the execution of any subsequent code unless the thrown error is caught
    //  in a try-catch block. If you don't want to halt execution, you can simply remove the throw statement.
    throw new Error(theIn); // Throw an error to halt execution
  }
}

// SCRIPTS OF SEPARATE OBJECTS IN OPENSCRIPT -- THESE CAME AFTER THE "SECTIONED" PART IN THE DOCUMENT
//
// HARALD: The functionality of the scripts "to handle enterfield" and "to handle leavefield" of page "Start" (the input page)
// was to keep track of whether data had changed by user input. If any of the inputtable data had changed since last saved,
// the global variable currentFileIsSaved changed from TRUE to FALSE. This mattered for file saving - if the user wanted
// to close the program, or open another file, or start a new file, the user would be prompted for saving the data before proceeding if
// the data had changed.
//
// The "to handle buttonClick" handle of the button with name "Beregn" on page id 1 (page "Start") had the functionality to
// make the program prepare data for output, perform all calculations, and display output. This was achieved by:
// 1. Setting the global variable gUseItemSubset to "All" so results should be calculated based on all items;
// 2. sending the command (i.e., calling the function) "prepareInputForOutput" which in turn would trigger all the actions needed.
//
// The "to handle buttonClick" handle of the button with name "Toem" on page id 1 (page "Start") had the functionality to
// empty all data and set the global variable "gAlder" which represents the age of the child to the missing value -9999
//
// HARALD: The field "alder" of the page "Start" had two handlers: "on enterField" and "on leaveField". This is important
// functionality for the program results - this is the functionality that converts the age from the input and display format
// in years:months (e.g., like "6:1") to a number. The functionality of the scripts did the following:
// When a user entered the field, i.e., started editing it (by tabbing to it or clicking on it), the global variable
// that represents the age of the child in machine format, gAlder, was set to the missing value -9999.
// And when a user left the field, i.e., finished editing it by tabbing out of it or clicking elsewhere on the page,
// the contents of the field were validated. Valid formats could be "" (a NULL string) or the "6:1" format where the first
// integer should represent a reasonable year, say, between 1 and 10, and the second integer should represent a month,
// i.e. minimum 0 and maximum 11. If an invalid value was given, the user should be alerted and told how to input age. Further
// execution was stopped, so that if the user i.e. had clicked the button to show results, nothing would happen except the
// alert for wrong input. Validity of text was checked by passing the text of the field to the function "yearMonthToDec" which would
// return a number only if the input was valid. This function is defined in the current code.
//
// The page "PrintPage1", the output display, had a "to handle enterPage" handler. This would be activated when the page
// was opened, i.e., when the page was displayed. It sent three commands (i.e., called three functions) in turn, namely:
//	send toggleCalcAE // which manipulates the way meny items are displayed based on the contents of the global array gIsValidAE[]
//	send adjustShowRasch // which manipuletes the way a menu item is displayed based on the global variable "svShowRasch"
//	send setGraph 0 // which is the script that contains the main functionality for creating/displaying the output (0 is a parameter)
