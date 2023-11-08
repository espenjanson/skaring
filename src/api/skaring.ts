// The translator suggest to use FileSaver.js to ease file writing.
// See note at function lagreSomFil
// In such case, needs to first install FileSaver.js
// (In shell, run the following to install:)
// npm install file-saver
// and then, import and use in TypeScript code: [It is commented out because it creates an error.]
// import { saveAs } from 'file-saver';

// fs is needed for file reading/writing.
import * as fs from "fs";
//

export class Skaring {
  // SECTION "-- ***************** INITIALIZATION ************************""

  // Global variables that represent dynamic data / user-inputted and user-manipulated
  // variables. These are implemented as global variables in the current transition/
  // intermediate version, but must be changed to represent actual dynamic data
  // in a working version.
  gRawItemScoreString: string; // 50 test items
  navn_value: string; // note text string
  alder_value: string; // age text string
  gutt_value: boolean; // 1 if boy is checked and 0 otherwise
  jente_value: boolean; // 1 if girl is checked and 0 otherwise (both can be 0)

  // System configurations
  sysDateFormat: string;
  sysDecimal: string;
  sysList: string;

  // Global variables for file handling
  currentFile: string | null;
  currentFileIsSaved: boolean;
  versionString: string;

  // Global variables for results display parameters
  // Includes age groups labels and thresholds & percentiles
  // that are not manipulated before results display is created
  svShowRasch: boolean;
  gUseItemSubset: string;
  gIsValidAE: boolean[];
  gModelPercentiles: number[][];
  gAgeGroupLabels: string[];
  gItemLabels: string[];
  gAgeGroupThresholds: number[][];
  graphicBounds: { x1: number; y1: number; x2: number; y2: number };
  rectangleGraph: { x1: number; y1: number; x2: number; y2: number };

  // Global variables and constants for Rasch-measure calculations and error handling
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
  gAlder: number;
  aItemDifficulties: number[];
  // Note: The following global variable is listed under the section that represents
  // dynamic data. But see how it is used - it may perhaps be efficient to have it as
  // a calculation variable that is filled from dynamic data.
  //   gRawItemScoreString: string;

  constructor() {
    // Global variables that represent dynamic data / user-inputted and user-manipulated
    // variables. These are implemented as global variables in the current transition/
    // intermediate version, but must be changed to represent actual dynamic data
    // in a working version.
    this.gRawItemScoreString =
      "99999999999999999999999999999999999999999999999999";
    this.navn_value = "Ola Normann"; // note text string
    this.alder_value = "8:0"; // age text string
    this.gutt_value = true; // true if boy is checked and 0 otherwise (both can be false)
    this.jente_value = false; // true if girl is checked and 0 otherwise (both can be false)
    // System configurations
    this.sysDateFormat = "dd.mm.yyyy";
    this.sysDecimal = ".";
    this.sysList = ",";

    // Global variables for file handling
    this.currentFile = null;
    this.currentFileIsSaved = true;
    this.versionString = "NUBUMotor_101";

    // Global variables for results display parameters
    // Includes age groups labels and thresholds & percentiles
    // that are not manipulated before results display is created
    this.svShowRasch = false;
    this.gUseItemSubset = "All";
    this.gIsValidAE = [false, false, false, false, false];
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
    // graphicBounds is the metric of the actual (dynamic) output canvas excluding margins.
    // It will be redefined later, but is set to some arbitrary values here.
    this.graphicBounds = { x1: 100, y1: 100, x2: 14900, y2: 22900 };
    // rectangleGraph is the metric of the legacy ToolBook graphic display (graph). It is used
    // for conversion:
    this.rectangleGraph = { x1: 1692, y1: 8262, x2: 2400, y2: 13977 };

    // Global variables and constants for Rasch-measure calculations and error handling
    this.gResult = 0;
    this.gMeasure = -9999;
    this.gCalculateDebugOutput = "";
    this.gCalculateDebugCurrentState = "Initialized.";
    this.gSE = -9999;
    this.gNValid = 0;
    this.gIsMinEstimated = true;
    this.gIsMaxEstimated = true;
    this.gConvertParameter1 = 1.968;
    this.gConvertParameter2 = 0.254;
    this.gMinEstAge = 3.5;
    this.gMaxEstAge = 18;
    this.gAlder = -9999;
    this.aItemDifficulties = [
      -1.94, -1.38, -1.22, -0.68, -0.15, -0.36, 0.43, 1.27, 2.24, 2.06, -2.76,
      -1.7, -1.02, -0.8, -0.29, 0.37, 1.05, 1.33, 1.61, 2.23, -2.54, -2.33,
      -1.72, -1.59, -1.35, -0.08, -0.37, 1.6, 1.49, 1.49, -2.82, -1.89, -0.83,
      -0.22, -0.26, -0.12, 1.31, 1.62, 1.93, 2.4, -1.54, -1.43, -1.04, 0.21,
      0.89, 1.19, 1.25, 1.34, 1.19, 1.94,
    ];

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

  // HARALD: THE FOLLOWING FUNCTIONS, WHICH CREATE OR MANIPULATE OBJECTS ON THE OUTPUT PICTURE/CANVAS,
  // NEED TO BE DEFINED. I AM GIVING
  // DEFINITIONS AND THE OPENSCRIPT CONTENTS - MUST WRITE TYPESCRIPT FUNCTIONS THAT MANIPULATE OUTPUT
  // GRAPHIC ELEMENTS IN THE SAME WAY.

  // HARALD: I wrote this function in TypeScript without testing it.
  // It should convert vertices in original ToolBook output page metric
  // (relative to the rectangle this.rectangleGraph) to current output canvas
  // metric (relative to the rectangle this.graphicBounds)
  convertVertices(vertices: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }): any {
    const outx1 =
      this.graphicBounds.x1 +
      ((vertices.x1 - this.rectangleGraph.x1) /
        (this.rectangleGraph.x2 - this.rectangleGraph.x1)) *
        (this.graphicBounds.x2 - this.graphicBounds.x1);
    const outy1 =
      this.graphicBounds.y1 +
      ((vertices.y1 - this.rectangleGraph.y1) /
        (this.rectangleGraph.y2 - this.rectangleGraph.y1)) *
        (this.graphicBounds.y2 - this.graphicBounds.y1);
    const outx2 =
      this.graphicBounds.x1 +
      ((vertices.x2 - this.rectangleGraph.x1) /
        (this.rectangleGraph.x2 - this.rectangleGraph.x1)) *
        (this.graphicBounds.x2 - this.graphicBounds.x1);
    const outy2 =
      this.graphicBounds.y1 +
      ((vertices.y2 - this.rectangleGraph.y1) /
        (this.rectangleGraph.y2 - this.rectangleGraph.y1)) *
        (this.graphicBounds.y2 - this.graphicBounds.y1);
    // HARALD: Note: Depending on what format TypeScript accepts for coordinates, it may
    // be necessary to round/adjust the four output numbers to integers. They are typically
    // decimal numbers after all the division above (while the four input numbers were integers).
    const myOutput = { x1: outx1, y1: outy1, x2: outx2, y2: outy2 };
    return myOutput;
  }

  createField(
    fieldName: string,
    vertices: { x1: number; y1: number; x2: number; y2: number },
    text: string,
    visible: boolean,
    fontFace: string,
    fontSize: string,
    fontStyle: string,
    fontColor: string,
    align: string
  ): void {
    // Should create a text field on the white drawing canvas. All fields are non-clickable (non-user-inputtable),
    // borderless (i.e., no frame), fill color white (or no fill), transparent (it may not matter much but
    // better transparent than opaque white if something should make them overlap), don't have baselines,
    // vertical alignment of text is "top" (i.e., the text fits in the top of the field, and if there
    // are several textlines they expand toward the bottom), all fields may have several textlines and
    // text should wrap to several lines if it does not fit on one line (and should of course also start
    // a new line on the '\n' character). Field text may contain a '\t' character, the text should then
    // tabulate to the next tab stop (this only happens in the field "led_kjonn" and the tab stop should
    // be selected so that the text "Kjønn:" fits before the first tab with some distance to it. Or reprogram
    // that detail.)
    //
    // Parameters:
    // fieldName: A unique string, which identifies the field (and by which the field may be called in
    //   following code, i.e., to change its text, or hide or show it)
    // text: The text that the field should display (text may contain \n and \t, see above)
    // vertices: the x1, y1, x2, and y2 coordinates (x and y of upper-left corner and lower-right corner,
    //   respectively, in original ToolBook page units. Must be converted to the metric of the current canvas.)
    // visible: If true, the field should be visible on the canvas. If false, it should be hidden (not displayed).
    // fontFace: May be "Sans" (use a generic sans-serif font) or "Courier" (use a Courier-type fixed-width font)
    // fontSize: May be "small" (small normal text, i.e., 8 pt) or "heading" (the page heading, i.e., 18 pt).
    // fontStyle: May be "regular", "underline" or "bold"
    // fontColor: May be "black" or "lightGray" (text should appear dimmed/light)
    // align: Indicates the horizontal alignment of text in the field. May be "center", "left", or "right".
    //
    // Converts input vertices to vertices in actual metric
    // HARALD: To be checked. Does this syntax create a const with the new vertices?.
    // Note: This syntax appears in several places. Adjust in all places where applicable.
    const actualVertices = this.convertVertices(vertices);
  }

  createLine(
    objectName: string,
    vertices: { x1: number; y1: number; x2: number; y2: number },
    visible: boolean,
    objectColor: string,
    transparent: boolean,
    lineStyle: string
  ): void {
    // Should create a line (as a graphic object) on the drawing canvas.
    //
    // Parameters:
    // objectName: A unique string, which identifies the line (and by which the object may be called in
    //   following code, i.e., to show/hide it or to move it on the canvas)
    // vertices: the x1, y1, x2, and y2 coordinates (x and y of upper-left corner and lower-right corner,
    //   respectively, in original ToolBook page units. Must be converted to the metric of the current canvas.)
    //   NOTE: All lines are either horizontal or vertical. Lines are thus 1-dimensional objects in 2-dimensional
    //   space (i.e., a horizontal line has y1 = y2 and a vertical line has x1 = x2). The thickness of the
    //   line is not given by the vertices parameter, but by the lineStyle parameter below.
    // visible: If true, the object should be visible on the canvas. If false, it should be hidden (not displayed).
    // objectColor: May be "black", "lightGray" (line should appear dimmed/light), or "darkGray" (line should
    //   appear as dark, but visibly lighter than black)
    // transparent: Whether the object should be drawn transparent.
    // lineStyle: Indicates the type of line. May be "thin" (a thin line, readily visible, i.e., 1 pt.),
    //   "dotted" (a thin line which is dotted i.e., dots separated by white space), or
    //   "thick" (a thick/marked line that attracts attention, i.e, 4 pt.)
    //
    // Converts input vertices to vertices in actual metric
    // HARALD: To be checked. Does this syntax create a const with the new vertices?.
    // Note: This syntax appears in several places. Adjust in all places where applicable.
    const actualVertices = this.convertVertices(vertices);
  }

  createCIRectangle(
    vertices: { x1: number; y1: number; x2: number; y2: number },
    visible: boolean
  ): void {
    // This function will only be called once; there is only one rectangle to create.
    // It is the CI (confidence interval) rectangle which is to be created. The only
    // properties that we want to be variable at the time of creation is its vertices
    // and its visibility. These may also be manipulated later by calling
    // setRectangleVisibility and setRectangleVertices:
    // vertices: the x1, y1, x2, and y2 coordinates. (x and y of upper-left corner and lower-right corner,
    // visible: If true, the object should be visible on the canvas. If false, it should be hidden (not displayed).
    //   respectively, in original ToolBook page units. Must be converted to the metric of the current canvas.)
    //   Rectangles are 2d-objects (x1 != x2 and y1 != y2).
    // The rest of the properties of the rectangle will remain constant:
    // The objectName, unique string, which identifies the line (and by which the object may be called in
    //   following code to show/hide it or to move it on the canvas), must be "CI"
    // The color/pattern of the rectanble should be a medium gray [i.e., 25% black] or a patterned fill
    //   so that objects under it are visible and readable through the transparency, cf. old ToolBook
    //   implementation of the CI rectangle.)
    // transparent: This rectangle must be transparent, i.e., objects in underlying layers should be
    //   visible through it.
    // lineStyle: The outer contours of the rectangle should be marked by a "thin" (a thin line,
    //   readily visible, i.e., 1 pt.), black, outline.
    //
    // Converts input vertices to vertices in actual metric
    // HARALD: To be checked. Does this syntax create a const with the new vertices?.
    // Note: This syntax appears in several places. Adjust in all places where applicable.
    const actualVertices = this.convertVertices(vertices);
  }

  setFieldText(fieldName: string, newText: string): void {
    //text of field (fieldName) of page "PrintPage1"  = newText
  }

  // HARALD: Not used in current implementation - may be deleted if works without.
  // setFieldPosition(
  //   fieldName: string,
  //   newPosition: { x: number; y: number }
  // ): void {
  //   // position of field (fieldName) of page "PrintPage1"  = newPosition;
  // }

  setFieldVisibility(fieldName: string, isVisible: boolean): void {
    // visible of field (fieldName) of page "PrintPage1"  = isVisible
  }
  // HARALD: Not used in current implementation - may be deleted if works without.
  // setFieldVertices(
  //   fieldName: string,
  //   newVertices: { x1: number; y1: number; x2: number; y2: number }
  // ): void {
  //   //vertices of field (fieldName) of page "PrintPage1"  = newVertices
  // }
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
  // HARALD: Not used in current implementation - may be deleted if works without.
  // setLinePosition(
  //   lineName: string,
  //   newPosition: { x: number; y: number }
  // ): void {
  //   // position of line (lineName) of page "PrintPage1"  = newPosition
  // }
  setLineVertices(
    lineName: string,
    newVertices: { x1: number; y1: number; x2: number; y2: number }
  ): void {
    // vertices of line (lineName) of page "PrintPage1"  = newVertices
    //
    // Converts input vertices to vertices in actual metric
    // HARALD: To be checked. Does this syntax create a const with the new vertices?.
    // Note: This syntax appears in several places. Adjust in all places where applicable.
    const actualVertices = this.convertVertices(newVertices);
  }
  setLineVisibility(lineName: string, isVisible: boolean): void {
    // visible of line (lineName) of page "PrintPage1"  = isVisible; return 1
  }

  setRectangleVertices(
    rectangleName: string,
    newVertices: { x1: number; y1: number; x2: number; y2: number }
  ): void {
    // vertices of rectangle (rectangleName) of page "PrintPage1"  = newVertices; return 1
    //
    // Converts input vertices to vertices in actual metric
    // HARALD: To be checked. Does this syntax create a const with the new vertices?.
    // Note: This syntax appears in several places. Adjust in all places where applicable.
    const actualVertices = this.convertVertices(newVertices);
  }
  setRectangleVisibility(rectangleName: string, isVisible: boolean): void {
    // visible of rectangle (rectangleName) of page "PrintPage1"  = isVisible; return 1
  }

  setGraph(redrawAll: number): void {
    // This is the script that manipulates the objects on the output page
    let minage: number, maxage: number, minMeasure: number, maxMeasure: number;
    let maxPU: number, minPU: number, leftPU: number, rightPU: number;
    // the ***PT constants should not be in use. Delete if this works without them.
    //    let maxPT: number, minPT: number, leftPT: number, rightPT: number;
    const promptoffset: number = 100;

    // HARALD: The "redrawAll" parameter is not used any longer; remove it from this function and
    // calls to it.

    let showRaschMeasure: boolean;
    // HARALD: This has been simplified. In OpenScript, I checked if "sysLevel" was "reader", i.e.
    // if the program was running/executing. If not, I set showRaschMeasure to "true" anyway. Here,
    // I am assuming that the program is running.
    showRaschMeasure = this.svShowRasch;

    // rectangleGraph and its components maxPU, minPU, leftPU, rightPU gives the coordinates in
    // ToolBook metric of the output elements in the visual graph. rectangleGraph is assigned in
    // the constructor.
    //    let rectangleGraph = { x1: 1692, y1: 8262, x2: 2400, y2: 13977 };
    maxPU = this.rectangleGraph.y1;
    minPU = this.rectangleGraph.y2;
    leftPU = this.rectangleGraph.x1;
    rightPU = this.rectangleGraph.x2;

    /*  // HARALD: This is not used (we don't readjust text fields relative to rectangleTextAlign),
    // this code can be deleted if the program runs without it.
   // HARALD: Similarly, the point of the next assignment is to get the rectangle coordinates
    // for proper adjustment of text fields. In OpenScript, the corresponding dynamic statement
    // was:
    // get vertices of rectangle "TextAlignField" of page "PrintPage1" (we don't use a
    // corresponding rectangle in TypeScript)
    let rectangleTextAlign = { x1: 3108, y1: 8262, x2: 8460, y2: 13977 };
    maxPT = rectangleTextAlign.y1;
    minPT = rectangleTextAlign.y2;
    leftPT = rectangleTextAlign.x1;
    rightPT = rectangleTextAlign.x2;
 */

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

    // HARALD: The following code creates the graphic objects for the output drawing canvas.
    // The objects are created in the intended layer order, i.e., the first created object
    // should appear "in back" and the last created object "in front" (this matters for
    // transparencies, in particular the "CI" rectangle is placed "on top" of other graphics
    // which should be visible through it). In this order, also, static elements (which may
    // be hidden or shown but don't change position or size and don't change their content/text)
    // are created first (i.e., in the background), and objects that change dynamically
    // (i.e., change position or size, or their text/content/fontstyle) are created later.

    // HARALD: Note that the creation of the output canvas has two steps. First, all
    // elements are created with default properties. Then, properties (i.e., position,
    // size, text/contents, bold style of last word of text) is manipulated according
    // to data and output options. This is effective if it is meaningful to create the
    // drawing canvas and readjust it for changed/new output. What needs to be added if
    // that is to be used, is code to make the "create" part run only once, and the
    // part that changes objects' appearance may be run each time the output display
    // is regenerated. - - -
    // However, if all objects must be created anew each time the output display should
    // change, the below code is unefficient and the part that creates objects should be
    // combined with the part that changes objects below it.
    //

    // HARALD: At this point, Espen should start to create/define a white drawing canvas
    // with the desired size for the output. The ToolBook graphic output page happened to have the
    // proportions (horizontal:vertical) of about 1:1.53 (= about 15:23). The creation
    // and manipulation of graphic output elements below should take place all on the
    // drawing canvas. After the size of the drawing canvas has been defined, the outer
    // bounds for any graphic elements must be given here in graphicBounds. The graphicBounds
    // should be the proportions of the drawing canvas, minus any margins we want, i.e.,
    // white space we want outside of drawing objects on the canvas. For example, if
    // the drawing canvas is defined (x1, x2, y1, y2 for upper-left xy and lower-right xy)
    // to be of shape (0, 0, 15000, 23000) and one should want margins/white space of 100
    // on all four sides, the graphicBounds should be set to (100, 100, 14900, 22900). This
    // will make the conversion of x and y coordinates from original ToolBook metric
    // to the actual, dynamic metric work. NEEDS TO BE DONE DYNAMICALLY:
    this.graphicBounds = { x1: 100, y1: 100, x2: 14900, y2: 22900 };

    // The following code creates all output objects with default properties/contents:
    // HARALD: Commented-out create... calls are for objects that are legacy from ToolBook
    // but which I think are not used and not needed. They are kept until we have tested
    // the code but should be deleted if it proves to be the case that we don't need them.

    this.createField(
      "headingfield",
      { x1: 516, y1: 132, x2: 9411, y2: 687 },
      "NUBU 4-16 Samleskår for motoriske oppgaver",
      true,
      "Sans",
      "heading",
      "bold",
      "black",
      "center"
    );
    this.createField(
      "led_navn",
      { x1: 906, y1: 741, x2: 1761, y2: 1056 },
      "Notat:",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createField(
      "led_merknad_NOT_USED",
      { x1: 918, y1: 1449, x2: 1875, y2: 1764 },
      "Merknad:_NOT_USED",
      false,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createField(
      "led_merknad2_NOT_USED",
      { x1: 918, y1: 1809, x2: 1899, y2: 2124 },
      "Merknad 2:_NOT_USED",
      false,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createField(
      "led_alder",
      { x1: 2715, y1: 1446, x2: 3240, y2: 1761 },
      "Alder:",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createLine(
      "ageline1",
      { x1: 1692, y1: 13977, x2: 2400, y2: 13977 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline2",
      { x1: 1692, y1: 13511, x2: 2400, y2: 13511 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline3",
      { x1: 1692, y1: 13100, x2: 2400, y2: 13100 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline4",
      { x1: 1692, y1: 12732, x2: 2400, y2: 12732 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline5",
      { x1: 1692, y1: 12400, x2: 2400, y2: 12400 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline6",
      { x1: 1692, y1: 12096, x2: 2400, y2: 12096 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline7",
      { x1: 1692, y1: 11558, x2: 2400, y2: 11558 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline8",
      { x1: 1692, y1: 11092, x2: 2400, y2: 11092 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline9",
      { x1: 1692, y1: 10681, x2: 2400, y2: 10681 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline10",
      { x1: 1692, y1: 10313, x2: 2400, y2: 10313 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline11",
      { x1: 1692, y1: 9677, x2: 2400, y2: 9677 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline12",
      { x1: 1692, y1: 9139, x2: 2400, y2: 9139 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline13",
      { x1: 1692, y1: 8673, x2: 2400, y2: 8673 },
      true,
      "black",
      false,
      "dotted"
    );
    this.createLine(
      "ageline14",
      { x1: 1692, y1: 8262, x2: 2400, y2: 8262 },
      true,
      "black",
      false,
      "dotted"
    );
    // this.createLine("measureTick1_NOT_USED",{x1: 2580, y1: 348, x2: 2808, y2: 348},false,"black",false,"thin")
    // this.createLine("measureTick2_NOT_USED",{x1: 2610, y1: 378, x2: 2838, y2: 378},false,"black",false,"thin")
    // this.createLine("measureTick3_NOT_USED",{x1: 2640, y1: 408, x2: 2868, y2: 408},false,"black",false,"thin")
    this.createLine(
      "measureTick4",
      { x1: 2400, y1: 13697, x2: 2550, y2: 13697 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick5",
      { x1: 2400, y1: 13254, x2: 2550, y2: 13254 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick6",
      { x1: 2400, y1: 12811, x2: 2550, y2: 12811 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick7",
      { x1: 2400, y1: 12367, x2: 2550, y2: 12367 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick8",
      { x1: 2400, y1: 11924, x2: 2550, y2: 11924 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick9",
      { x1: 2400, y1: 11481, x2: 2550, y2: 11481 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick10",
      { x1: 2400, y1: 11038, x2: 2550, y2: 11038 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick11",
      { x1: 2400, y1: 10595, x2: 2550, y2: 10595 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick12",
      { x1: 2400, y1: 10151, x2: 2550, y2: 10151 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick13",
      { x1: 2400, y1: 9708, x2: 2550, y2: 9708 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick14",
      { x1: 2400, y1: 9265, x2: 2550, y2: 9265 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick15",
      { x1: 2400, y1: 8822, x2: 2550, y2: 8822 },
      true,
      "black",
      false,
      "thin"
    );
    this.createLine(
      "measureTick16",
      { x1: 2400, y1: 8378, x2: 2550, y2: 8378 },
      true,
      "black",
      false,
      "thin"
    );
    // this.createLine("measureTick17_NOT_USED",{x1: 3060, y1: 828, x2: 3288, y2: 828},false,"black",false,"thin")
    // this.createLine("measureTick18_NOT_USED",{x1: 3090, y1: 858, x2: 3318, y2: 858},false,"black",false,"thin")
    this.createField(
      "AgeEquivPrompt",
      { x1: 845, y1: 7704, x2: 2240, y2: 7932 },
      "Aldersekvivalent",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    this.createField(
      "ageprompt1",
      { x1: 1097, y1: 13863, x2: 1592, y2: 14091 },
      "3:6",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt2",
      { x1: 1097, y1: 13397, x2: 1592, y2: 13625 },
      "4:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt3",
      { x1: 1097, y1: 12986, x2: 1592, y2: 13214 },
      "4:6",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt4",
      { x1: 1097, y1: 12618, x2: 1592, y2: 12846 },
      "5:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt5",
      { x1: 1097, y1: 12286, x2: 1592, y2: 12514 },
      "5:6",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt6",
      { x1: 1097, y1: 11982, x2: 1592, y2: 12210 },
      "6:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt7",
      { x1: 1097, y1: 11444, x2: 1592, y2: 11672 },
      "7:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt8",
      { x1: 1097, y1: 10978, x2: 1592, y2: 11206 },
      "8:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt9",
      { x1: 1097, y1: 10567, x2: 1592, y2: 10795 },
      "9:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt10",
      { x1: 1097, y1: 10199, x2: 1592, y2: 10427 },
      "10:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt11",
      { x1: 1097, y1: 9563, x2: 1592, y2: 9791 },
      "12:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt12",
      { x1: 1097, y1: 9025, x2: 1592, y2: 9253 },
      "14:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt13",
      { x1: 1097, y1: 8559, x2: 1592, y2: 8787 },
      "16:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "ageprompt14",
      { x1: 1097, y1: 8148, x2: 1592, y2: 8376 },
      "18:0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "MeasurePromptR",
      { x1: 2333, y1: 7692, x2: 3176, y2: 8064 },
      "Rasch-\nskår",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    // this.createField("measureprompt0",{x1: 8475, y1: 2595, x2: 8970, y2: 2955},"NOT_USED",false,"Sans","small","regular","black","right")
    // this.createField("measureprompt1",{x1: 8805, y1: 2040, x2: 9570, y2: 2595},"NOT_USED",false,"Sans","small","regular","black","right")
    // this.createField("measureprompt2",{x1: 8535, y1: 2655, x2: 9030, y2: 3015},"NOT_USED",false,"Sans","small","regular","black","right")
    // this.createField("measureprompt3",{x1: 8565, y1: 2685, x2: 9060, y2: 3045},"NOT_USED",false,"Sans","small","regular","black","right")
    this.createField(
      "measureprompt4",
      { x1: 2550, y1: 13583, x2: 2900, y2: 13811 },
      "-2.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt5",
      { x1: 2550, y1: 13140, x2: 2900, y2: 13368 },
      "-2.0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt6",
      { x1: 2550, y1: 12697, x2: 2900, y2: 12925 },
      "-1.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt7",
      { x1: 2550, y1: 12253, x2: 2900, y2: 12481 },
      "-1.0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt8",
      { x1: 2550, y1: 11810, x2: 2900, y2: 12038 },
      "-0.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt9",
      { x1: 2550, y1: 11367, x2: 2900, y2: 11595 },
      "0.0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt10",
      { x1: 2550, y1: 10924, x2: 2900, y2: 11152 },
      "0.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt11",
      { x1: 2550, y1: 10481, x2: 2900, y2: 10709 },
      "1.0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt12",
      { x1: 2550, y1: 10037, x2: 2900, y2: 10265 },
      "1.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt13",
      { x1: 2550, y1: 9594, x2: 2900, y2: 9822 },
      "2.0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt14",
      { x1: 2550, y1: 9151, x2: 2900, y2: 9379 },
      "2.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt15",
      { x1: 2550, y1: 8708, x2: 2900, y2: 8936 },
      "3.0",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    this.createField(
      "measureprompt16",
      { x1: 2550, y1: 8264, x2: 2900, y2: 8492 },
      "3.5",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "right"
    );
    // this.createField("measureprompt17",{x1: 8376, y1: 4062, x2: 8871, y2: 4422},"NOT_USED",false,"Sans","small","regular","black","right")
    // this.createField("measureprompt18",{x1: 8358, y1: 4944, x2: 8853, y2: 5304},"NOT_USED",false,"Sans","small","regular","black","right")
    this.createField(
      "AreaPrompt_A",
      { x1: 3005, y1: 7692, x2: 4005, y2: 8342 },
      "A: Statisk\nkoordinasjon",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    this.createField(
      "AreaPrompt_B",
      { x1: 4064, y1: 7686, x2: 5064, y2: 8336 },
      "B: Hendenes\ndynamiske\nkoordinasjon",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    this.createField(
      "AreaPrompt_C",
      { x1: 5123, y1: 7692, x2: 6123, y2: 8342 },
      "C: Generell dynamisk\nkoordinasjon",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    this.createField(
      "AreaPrompt_D",
      { x1: 6182, y1: 7686, x2: 7182, y2: 8336 },
      "D: Hurtighet",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    this.createField(
      "AreaPrompt_E",
      { x1: 7253, y1: 7692, x2: 8253, y2: 8342 },
      "E: Simultane\nbevegelser",
      true,
      "Sans",
      "small",
      "underline",
      "black",
      "center"
    );
    this.createField(
      "item_1",
      { x1: 3108, y1: 13105, x2: 3771, y2: 13297 },
      "A1",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_2",
      { x1: 3108, y1: 12620, x2: 3771, y2: 12812 },
      "A2",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_3",
      { x1: 3108, y1: 12454, x2: 3771, y2: 12646 },
      "A3",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_4",
      { x1: 3108, y1: 11988, x2: 3771, y2: 12180 },
      "A4",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_5",
      { x1: 3480, y1: 11602, x2: 4143, y2: 11794 },
      "A5",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_6",
      { x1: 2880, y1: 11608, x2: 3543, y2: 11800 },
      "A6",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_7",
      { x1: 3108, y1: 11004, x2: 3771, y2: 11196 },
      "A7",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_8",
      { x1: 3108, y1: 10259, x2: 3771, y2: 10451 },
      "A8",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_9",
      { x1: 3480, y1: 9483, x2: 4143, y2: 9675 },
      "A9",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_10",
      { x1: 2880, y1: 9475, x2: 3543, y2: 9667 },
      "A10",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_11",
      { x1: 4178, y1: 13831, x2: 4841, y2: 14023 },
      "B1",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_12",
      { x1: 4178, y1: 12892, x2: 4841, y2: 13084 },
      "B2",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_13",
      { x1: 4178, y1: 12289, x2: 4841, y2: 12481 },
      "B3",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_14",
      { x1: 4178, y1: 12094, x2: 4841, y2: 12286 },
      "B4",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_15",
      { x1: 4178, y1: 11642, x2: 4841, y2: 11834 },
      "B5",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_16",
      { x1: 4178, y1: 11057, x2: 4841, y2: 11249 },
      "B6",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_17",
      { x1: 4178, y1: 10454, x2: 4841, y2: 10646 },
      "B7",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_18",
      { x1: 4178, y1: 10206, x2: 4841, y2: 10398 },
      "B8",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_19",
      { x1: 4178, y1: 9958, x2: 4841, y2: 10150 },
      "B9",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_20",
      { x1: 4178, y1: 9408, x2: 4841, y2: 9600 },
      "B10",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_21",
      { x1: 5249, y1: 13636, x2: 5912, y2: 13828 },
      "C1",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_22",
      { x1: 5249, y1: 13450, x2: 5912, y2: 13642 },
      "C2",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_23",
      { x1: 5249, y1: 12934, x2: 5912, y2: 13126 },
      "C3",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_24",
      { x1: 5249, y1: 12758, x2: 5912, y2: 12950 },
      "C4",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_25",
      { x1: 5249, y1: 12570, x2: 5912, y2: 12762 },
      "C5",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_26",
      { x1: 5585, y1: 11612, x2: 6248, y2: 11804 },
      "C6",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_27",
      { x1: 4985, y1: 11617, x2: 5648, y2: 11809 },
      "C7",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_28",
      { x1: 5249, y1: 10123, x2: 5912, y2: 10315 },
      "C8",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_29",
      { x1: 5561, y1: 9956, x2: 6224, y2: 10148 },
      "C9",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_30",
      { x1: 4937, y1: 9956, x2: 5600, y2: 10148 },
      "C10",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_31",
      { x1: 6319, y1: 13881, x2: 6982, y2: 14073 },
      "D1",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_32",
      { x1: 6319, y1: 13060, x2: 6982, y2: 13252 },
      "D2",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_33",
      { x1: 6319, y1: 12121, x2: 6982, y2: 12313 },
      "D3",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_34",
      { x1: 6307, y1: 11640, x2: 6970, y2: 11832 },
      "D4",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_35",
      { x1: 5995, y1: 11459, x2: 6658, y2: 11651 },
      "D5",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_36",
      { x1: 6643, y1: 11455, x2: 7306, y2: 11647 },
      "D6",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_37",
      { x1: 6319, y1: 10224, x2: 6982, y2: 10416 },
      "D7",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_38",
      { x1: 6319, y1: 9949, x2: 6982, y2: 10141 },
      "D8",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_39",
      { x1: 6319, y1: 9674, x2: 6982, y2: 9866 },
      "D9",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_40",
      { x1: 6319, y1: 9258, x2: 6982, y2: 9450 },
      "D10",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_41",
      { x1: 7390, y1: 12774, x2: 8053, y2: 12966 },
      "E1",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_42",
      { x1: 7390, y1: 12629, x2: 8053, y2: 12821 },
      "E2",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_43",
      { x1: 7390, y1: 12307, x2: 8053, y2: 12499 },
      "E3",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_44",
      { x1: 7390, y1: 11199, x2: 8053, y2: 11391 },
      "E4",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_45",
      { x1: 7390, y1: 10596, x2: 8053, y2: 10788 },
      "E5",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_46",
      { x1: 7738, y1: 10342, x2: 8401, y2: 10534 },
      "E6",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_47",
      { x1: 7054, y1: 10349, x2: 7717, y2: 10541 },
      "E7",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_48",
      { x1: 7054, y1: 10173, x2: 7717, y2: 10365 },
      "E8",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_49",
      { x1: 7738, y1: 10174, x2: 8401, y2: 10366 },
      "E9",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "item_50",
      { x1: 7390, y1: 9665, x2: 8053, y2: 9857 },
      "E10",
      true,
      "Sans",
      "small",
      "regular",
      "lightGray",
      "center"
    );
    this.createField(
      "copyright",
      { x1: 15, y1: 14535, x2: 9570, y2: 14790 },
      "Grete Andrup, Harald Janson og Bente Gjærum: NUBU 4-16 Motorisk test. © 2006-2023 Universitetsforlaget og Harald Janson. Alle rettigheter reservert.",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "center"
    );
    this.createField(
      "navn",
      { x1: 1920, y1: 744, x2: 9027, y2: 1419 },
      "_TO_BE_FILLED_WITH_DATA_",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createField(
      "alder",
      { x1: 3261, y1: 1437, x2: 3810, y2: 1707 },
      "_TO_BE_FILLED_WITH_DATA_",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createField(
      "led_kjonn",
      { x1: 912, y1: 1440, x2: 3273, y2: 1755 },
      "_TO_BE_FILLED_WITH_DATA_",
      true,
      "Sans",
      "small",
      "regular",
      "black",
      "left"
    );
    this.createField(
      "output",
      { x1: 924, y1: 1773, x2: 9180, y2: 8424 },
      "_TO_BE_FILLED_WITH_DATA_",
      true,
      "Courier",
      "small",
      "regular",
      "black",
      "left"
    );
    // The following 2 commented-out code lines should be deleted if not re-used (and calls a function, createRectangle, which is not defined).
    // this.createRectangle("TextAlignField_PROBABLY_NOT_USED",{x1: 3108, y1: 8262, x2: 8460, y2: 13977},true,"black",false,"none")
    // this.createRectangle("Graph1_PROBABLY_NOT_USED",{x1: 1692, y1: 8262, x2: 2400, y2: 13977},true,"black",false,"thin")
    this.createLine(
      "EstimateLine",
      { x1: 1692, y1: 10380, x2: 8460, y2: 10380 },
      true,
      "darkGray",
      true,
      "thick"
    );
    this.createCIRectangle({ x1: 1692, y1: 9233, x2: 2400, y2: 11526 }, true);

    // The following code manipulates the visibility of the Rasch
    // scale ticks and prompts, the item information fields, the estimate line, and the
    // confidence interval rectangle.

    // If Rasch measure scale is to be displayed, shows tick marks, tick mark labels, and the underlined heading.
    if (showRaschMeasure) {
      // Actually, only lines named 4 through 16, i.e., ctrJ from 3 to 15, are used.
      // Need not check the condition for manipulating lines.
      // Old code was:
      //      for (let ctrJ = 0; ctrJ < ageLinesMeasure.length; ctrJ++) {
      // if (
      //   ageLinesMeasure[ctrJ] >= minMeasure &&
      //   ageLinesMeasure[ctrJ] <= maxMeasure
      // ) {
      for (let ctrJ = 3; ctrJ < 16; ctrJ++) {
        this.setFieldVisibility("measureprompt" + (ctrJ + 1), true);
        this.setLineVisibility("measureTick" + (ctrJ + 1), true);
      }
      this.setFieldVisibility("measurepromptR", true);
    } else {
      // Similarly, need not cycle through all elements, just those that are used.
      //      for (let ctrJ = 0; ctrJ < ageLinesMeasure.length; ctrJ++) {
      for (let ctrJ = 3; ctrJ < 16; ctrJ++) {
        this.setFieldVisibility("measureprompt" + (ctrJ + 1), false);
        this.setLineVisibility("measureTick" + (ctrJ + 1), false);
      }
      this.setFieldVisibility("measurepromptR", false);
    }

    // information fields
    // HARALD: Below, we need to get the text data for the fields "navn" and "alder",
    // and the boolean values for the data choices "gutt" and "jente".
    // In the current intermediate/transition version, these are set as the global variables
    // navn_value, alder_value, gutt_value, and jente_value, which have been initialized
    // to some values above in declaration/initialization.
    // This should be changed to actual (user-inputted) data.
    // Likewise, we are using the 50 user-inputted item values in gRawItemScoreString, which
    // is initialized to some value. We must make sure that this reflects the current state
    // of the data in the 50 data fields/variables.

    // Fills information fields with contents from data
    this.setFieldText("navn", this.navn_value);
    this.setFieldText("alder", this.alder_value);
    if (this.gutt_value === true) {
      // Note: A tab character is inserted in the field, which must have a tab stop, or modify.
      this.setFieldText("led_kjonn", "Kjønn:\tGutt");
    } else {
      if (this.jente_value === false) {
        this.setFieldText("led_kjonn", "");
      } else {
        // Note: A tab character is inserted in the field, which must have a tab stop, or modify.
        this.setFieldText("led_kjonn", "Kjønn:\tJente");
      }
    }

    // Places estimate line
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
        x2: rightPU,
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

    // Places confidence interval rectangle
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

    // Sets text color of item information fields, and fills with item labels and data as applicable
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

    // Text field with numeric results

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
      // HARALD: Note. The global variable "alder_value" must be adjusted to
      // represent actual data. (alder_value is the user-inputted text value;
      // gAlder is a numeric value for calculation, they are not the same)
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
        this.alder_value +
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

  // The two following functions, writeNUBUFile and readNUBUFile, do the actual reading and writing of files.
  // The user interaction is handled further below in functions lagreFil, lagreSomFil, aapneFil, and nyFil.

  writeNUBUFile(inFileName: string): number {
    // --File format: A Windows/ANSI plain text file with 9 CRLF-separated text lines. The contents of the lines are:
    // --1. Navn (string)
    // --2. A string with two boolean values in text separated by a single space i.e. "true false" corresponding to values of "Gutt" and "Jente"
    // --3. blank in this version (used for birthdate in a previous version)
    // --4. blank in this version (used for test date in a previous version)
    // --5. Alder (string)
    // --6. blank in this version (used for optional note 1 in a previous version)
    // --7. blank in this version (used for optional note 2 in a previous version)
    // --8. Values of 50 items (string with length 50 where possible character values are '0', '1', '2', '9', and '*')
    // --9. Version string: Must be "NUBUMotor_101" for files created with this version, may be "NUBUMotor_100" in files written by a previous version

    try {
      let dataString: string = "";
      for (let ctrJ = 1; ctrJ <= 50; ctrJ++) {
        const charValue = this.gRawItemScoreString[ctrJ - 1] || "9";
        dataString += charValue === "NULL" ? "*" : charValue.charAt(0);
      }
      // Harald: To be tested if gutt_value and jente_value appear as e.g. "true false" i.e., lowercase text separated by " " in the result.
      const content: string =
        `${this.navn_value}\n` +
        `${this.gutt_value} ${this.jente_value}\n\n\n` +
        `${this.alder_value}\n\n\n` +
        `${dataString}\n` +
        "NUBUMotor_101\n";
      // HARALD: I think I would like to code the text file as Windows (ANSI), but I see below that the coding is set to "utf8". Will this create problems
      // with compatability with previous Windows-created files, and/or if users move files across operating systems?
      //
      // HARALD: In the translation, it was noted: "We're using the synchronous versions of the file reading/writing functions (readFileSync and writeFileSync)
      // for simplicity. However, in real-world scenarios, especially with large files or frequent IO operations, you might consider using the asynchronous
      // versions to avoid blocking the main thread." -- I don't anticipate large files or frequent IO operations, so is this an issue?
      fs.writeFileSync(inFileName, content, "utf8");
      return 1; // success
    } catch (error) {
      // HARALD: The functionality in case of an error occurring (like: the file could not be created, or not written to) should be to return 0 without
      // handling the error or alerting the user here. Is this what happens? (In the translation, it was noted: "Error handling is done using try-catch blocks.
      // If an error occurs, we simply return 0 to indicate failure, as per your requirements.")
      console.error(error);
      return 0; // failure
    }
  }

  readNUBUFile(inFileName: string): number {
    // Writes to a file. See the previous function for file format definition.
    try {
      const content: string = fs.readFileSync(inFileName, "utf8");
      const lines = content.split("\n");
      // HARALD: See previous function for a note re. text encoding (UTF-8 vs. Windows/ANSI), As above, I see below that the expected coding of the file to read
      // is set to "utf8". Will this create problems with compatability with previous Windows-created files (encoded Windows/ANSI), and/or if users move files
      // across operating systems?
      if (lines[8] !== "NUBUMotor_100" && lines[8] !== "NUBUMotor_101") {
        // HARALD: The translator noted: "For the user prompt, we're using the browser's built-in prompt function. This might not be ideal for all situations,
        // especially if you're building a Node.js application without a frontend. In such cases, other methods for user input might be more appropriate."
        const userResponse = prompt(
          "Ukjent filformat. Vil du fortsette?",
          "Fortsett"
        );
        if (userResponse !== "Fortsett") {
          // HARALD: Improvement is needed here. A return value of 0 will cause the calling function to alert the user to an error. That is not
          // the wanted behavior. Instead, the calling function should just stop with no further action. This could be amended by returning
          // a return value of e.g., 2, but this has not been implemented yet.
          return 0; // failure
        }
      }
      this.navn_value = lines[0];
      this.gutt_value = lines[1].split(" ")[0] === "true";
      this.jente_value = lines[1].split(" ")[1] === "true";
      this.alder_value = lines[4];
      // HARALD: The translator wrote the following code which fails because gRawItemScoreString is a string and cannot be changed character by character.
      // I have replaced that by untried code I wrote just below. Also, the suggested translation does not seem to check if data is a valid character.
      // for (let ctrJ = 1; ctrJ <= 50; ctrJ++) {
      //   this.gRawItemScoreString[ctrJ - 1] = lines[7].charAt(ctrJ - 1);
      // }
      let dataString: string = "";
      for (let ctrJ = 0; ctrJ < 50; ctrJ++) {
        const charValue = lines[7].charAt(ctrJ);
        // HARALD: To be tested/verified: If the encountered character is "0", "1", or "2", append that character to dataString. If not, append "9".
        if ("012".indexOf(charValue[0]) === -1) {
          dataString += "9";
        } else {
          dataString += charValue.charAt(0);
        }
      }
      this.gRawItemScoreString = dataString;
      return 1; // success
    } catch (error) {
      // HARALD: The functionality in case of an error occurring (like: the file could not be created, or not written to) should be to return 0 without
      // handling the error or alerting the user here. Is this what happens? (In the translation, it was noted: "Error handling is done using try-catch blocks.
      // If an error occurs, we simply return 0 to indicate failure, as per your requirements.")
      console.error(error);
      return 0; // failure
    }
  }

  // User interaction functions. In translation from OpenScript, the translator noted the following:
  /*   "You can achieve file reading and writing functionalities in TypeScript by using the Web APIs available
        in modern browsers. However, there are some limitations:
  1.	File Writing: Browsers do not have the capability to write files directly to the user’s filesystem 
        due to security restrictions. However, you can create Blob objects and create download links to allow
        the user to download and save them manually. You can use FileSaver.js to simplify this process.
  2.	File Reading: You can use the File API to read files selected by the user via an input element of 
        type file.
  3.	Directory Access: Modern browsers do not have the capability to set or get the current directory 
        due to security restrictions.
  4.	Showing Dialogs: For “Open” and “Save As” functionalities, you can use the <input type="file"> 
        element, and for showing alerts and confirm dialogs, you can use window.alert() and window.confirm().
  (Note.) As mentioned, the direct writing of files and getting/setting the current directory are restricted 
        in browsers due to security concerns, so some functionalities are achieved differently or omitted."
 */
  async lagreFil() {
    // If the currentFile is null or the versionString is not "NUBUMotor_101", it calls lagreSomFil. If the
    // file is written successfully, it updates the UI (to be implemented later).
    if (this.currentFile === null || this.versionString !== "NUBUMotor_101") {
      await this.lagreSomFil();
      return;
    }
    if (this.writeNUBUFile(this.currentFile) === 1) {
      // Update display needs to be implemented. (In ToolBook, the caption of the main window that
      // was displaying the application included the name of the open file, i.e., the name
      // of the file that was saved, cf. ToolBook UI implementation.)
      this.currentFileIsSaved = true;
    } else {
      window.alert(`Kunne ikke lagre filen ${this.currentFile}.`);
      // The translator changed the above to English:      window.alert(`Could not save the file ${this.currentFile}.`);
    }
  }

  lagreSomFil() {
    // The translator noted: "•	lagreSomFil: It tries to save the file with a default name and
    // updates the UI if successful."
    // The translator noted: "Here we use FileSaver.js to simplify the file saving process."
    // HARALD: In the following line: Replace defaultFilename with the default file name we want.
    // We would really like the user to be able to choose the location and name of file-to-be-saved,
    // in a standard operating-system dialog box. Is this what happens?
    let fileName = "defaultFilename.~Z4";
    if (this.writeNUBUFile(fileName) === 1) {
      this.versionString = "NUBUMotor_101";
      this.currentFile = fileName;
      this.currentFileIsSaved = true;
      // Update display needs to be implemented. (In ToolBook, the caption of the main window that
      // was displaying the application changed to include the name of the open file, i.e., the name
      // of the file that was just successfully saved, cf. ToolBook UI implementation.)
    } else {
      window.alert(`Kunne ikke lagre data i filen ${fileName}.`);
      // The translator changed the above to English: window.alert(`Could not save data in the file ${fileName}.`);
      // HARALD: We want no further action (program execution) to take place here, given that the
      // attempt to save-as has failed. Is that what happens?
    }
  }

  dummy1() {}

  aapneFil(argA?: string, argB?: string) {
    // •	aapneFil: It reads a file selected by the user. If the user cancels the file selection, it does nothing.
    //  If the file is read successfully, it updates the UI.
    this.gUseItemSubset = "All";
    if (!this.currentFileIsSaved) {
      if (window.confirm("Vil du lagre endringene?")) {
        // We want the Norwegian "Ja" or "Nei" to appear as response alternatives here, is that what happens?
        //          The translator changed the above to English: (window.confirm("Do you want to save the changes?")) {            this.lagreFil();
      }
    }
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt, .~Z4";
    /* 
    // HARALD: I HAVE COMMENTED OUT PARTS OF THE FUNCTION BECAUSE IT CREATED AN ERROR AT "event.target as ...".
    // IT MUST BE RE-UNCOMMENTED
    // **** FROM HERE ****
    input.onchange = (event) => {
      let file = (event.target as HTMLInputElement).files[0];
      if (file) {
        if (this.readNUBUFile(file) === 1) {
          this.currentFile = file.name;
          this.currentFileIsSaved = true;
          // Update display needs to be implemented. (In ToolBook, the caption of the main window that
          // was displaying the application changed to include the name of the open file, i.e., the name
          // of the file that was just successfully opened, cf. ToolBook UI implementation.)
        } else {
          window.alert(
            `Filen ${file.name} kunne ikke leses av programmet.`
            // The translator changed the above to English: `The file ${file.name} could not be read by the program.`
            // In this case, the global variables that govern file status and name, and the UI interface/
            // display, are unchanged.
          );
        }
      }
    };
    // **** TO HERE ****
     */
    input.click();
  }

  nyFil() {
    // If the data is not saved, the user is asked to confirm whether the user
    // wants to save the changes (and in such case, saves the data by calling
    // lagreFil()).
    this.versionString = "NUBUMotor_101";
    if (!this.currentFileIsSaved) {
      if (window.confirm("Vil du lagre endringene?")) {
        // The translator changed the above to English: if (window.confirm("Do you want to save the changes?")) {
        // The action we want is the following: The user is asked whether changes should be saved.
        // The response categories should be in Norwegian "Ja" or "Nei". Unless the user specifically
        // responds "No", changes should be saved by calling this.lagreFil(). Regardless of whether
        // this happens, program execution continues below, i.e., there is no "Cancel" option, the "New file"
        // action always happens regardless of user input to the prompt.
        this.lagreFil();
      }
    }
    // HARALD: We will need to implement a reset function to clear the form/UI.
    // I wrote a stub for the this.resetForm() function above to avoid an error here.
    this.resetForm(); // Calls the function that resets the UI and the data to default (blank).
    this.gUseItemSubset = "All";
    this.currentFile = null;
    // Update display needs to be implemented. (In ToolBook, the caption of the main window that
    // was displaying the application changed to signal that a new child had been
    // opened, and not saved to file, cf. ToolBook UI implementation.)
    this.currentFileIsSaved = true; // this variable should change to false whenever any data
    // is later inputted by user.
  }

  // DATA EXPORT FUNCTION "laesMangaFiler":
  /*   The translator noted: 
  The function you've provided is quite comprehensive and involves several file and directory operations that, as you've noted, 
  are not straightforward in a browser environment due to security restrictions. However, with recent advancements, there are 
  ways to handle some of these operations, albeit with certain limitations.

  The primary challenges in converting this script to TypeScript for use in a browser are:
  
  1.	Choosing a directory and reading its contents: Browsers traditionally haven't allowed web pages to browse the file 
      system. However, the recent Native File System API (also known as the File System Access API) allows web apps to 
      read and write to user-selected files and directories. This feature is not yet universally supported and is behind 
      a flag in some browsers.
  2.	Creating and writing to a file directly on the user's system: This is also handled by the File System Access API but,
      as mentioned, has limited support.
  3.	Reading multiple files: The standard way to read files in a browser is through an <input type="file"> element, which 
      allows users to select files. This can be set to allow multiple file selection.

  Considering these challenges, here's how you might structure the laesMangeFiler function in TypeScript, using the 
  File System Access API where possible and providing alternative strategies where it's not:
*/

  async laesMangeFiler() {
    //   The translator noted:
    //   This code uses the File System Access API to let the user select a directory and list its files, then write directly
    //   to a file on the user's system. However, you'll need to handle browser compatibility and permissions carefully:
    //   •	The showDirectoryPicker, showSaveFilePicker, and showOpenFilePicker methods are part of the File System Access API,
    //    which at my last update (September 2021) is not supported by all browsers. You'll need to check the current compatibility
    //    and potentially provide alternate solutions or instructions for users on unsupported browsers.
    //   •	The File System Access API requires user permission to read or write files, and users can revoke these permissions at any
    //   time. Your code will need to handle these cases gracefully.
    //   •	The code assumes that functions like aapneFil and prepareInputForOutput are asynchronous and can handle File objects or
    //   file contents directly. You might need to adjust these functions based on your actual implementation.
    //   •	The code does not handle all the data formatting and calculations that your original script does, such as formatting
    //   numbers, estimating ages, and handling missing values. You'll need to implement these based on your application's logic.
    //   •	Since direct access to the file system is limited in browsers, the script does not delete the output file if it already
    //   exists (as your original script does with removeFile32). The File System Access API lets you overwrite files, but you'll
    //   need to handle cases where the user does not grant permission to do so.
    //   Remember to test this thoroughly, handle exceptions, and provide clear user guidance, especially around browser support and
    //   permissions. Also, keep an eye on the current status of the File System Access API and other relevant features in the browsers you're targeting.
    // HARALD: THE WHOLE SCRIPT IS BLOCK COMMENTED OUT BECAUSE IT TRIGGERS SEVERAL ERRORS WHEN FUNCTIONALITY THAT
    // IS NOT IMPLEMENTED/LINKED IS CALLED. INCLUDES CALLS TO window.showDirectoryPicker, window.showSaveFilePicker,
    // and more.
    /*


    // You might need to check for browser support for the File System Access API
    if (!('showDirectoryPicker' in window)) {
        alert("Your browser does not support the required File System Access API.");
        return;
    }

    try {
        // Choose directory
        const directoryHandle = await window.showDirectoryPicker();

        // List files in directory
        const files: File[] = [];
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file') {
                files.push(await entry.getFile());
            }
        }

        // Ask user for the output file name, here we can't set default directory or filters
        const saveFileHandle = await window.showSaveFilePicker();

        // Create a FileSystemWritableFileStream to write to
        const writableStream = await saveFileHandle.createWritable();

        // Write the headers to the file
        let headers = "FILNAVN\tNOTAT\tKJØNN\tLOGALDER\t[BLANK]\tOPPGAVESKÅRER\tRASCHSKÅRE\tSTANDARDFEIL\tMINESTIMERT\tMAKSESTIMERT\tALDERSEKVIVALENT\tNEDRE GRENSE KONF.INT.\tØVRE GRENSE KONF.INT.\tMODELLBASERT PERSENTIL\tFILFORMAT\n";
        await writableStream.write(headers);

        // Process each file
        for (const file of files) {
            await this.aapneFil(file); // Assuming aapneFil is modified to handle File objects

            this.prepareInputForOutput("X");

            this.currentFileIsSaved = true;

  // Construct the data line
  
  // The translator noted re. the data line construction in the following code lines:
  
  // Given that each field represents a different piece of data, we need to ensure that we're accessing 
  // and formatting these fields properly.
  
  // However, please note that the actual implementation might differ based on how your data is structured 
  // in TypeScript, the methods available for your class, and how data is retrieved from files or calculated. 
  // Here, I'm assuming that after calling this.aapneFil(file) and this.prepareInputForOutput("X"), the 
  // relevant data is stored in variables within your class instance (this).
  
  //   This script constructs the dataLine string by appending each field followed by a tab character (\t) 
  //   to separate the fields in the output file. Please replace the method calls and property accesses with 
  //   the actual ones you have in your TypeScript class. Also, ensure the proper handling of any special 
  //   characters that might be included in your data strings (like quotes or tabs) as they could disrupt the 
  //   formatting of your output file. The methods used for calculations, such as this.yearMonthToDec, 
  //   this.estimateToPresentText, this.modellpersentilFraEstimat, and this.ageToMeasure, are placeholders 
  //   for your actual calculation methods. 
  
  
  // Initialize dataLine with the file name
  let dataLine = `${file.name}\t`;
  
  // Add the 'navn' value. Assuming it's a string that doesn't contain tabs or newlines
  dataLine += `${this.navn_value}\t`;
  
  // Add the 'KJØNN' value based on 'gutt_value' and 'jente_value'
  dataLine += `${this.gutt_value ? "1" : (this.jente_value ? "0" : "9")}\t`;
  
  // Add the 'LOGALDER'. I'm assuming you have a method 'yearMonthToDec' that converts age to a decimal and 'ln' calculates the natural logarithm
  let ageValue = this.alder_value ? this.ln(this.yearMonthToDec(this.alder_value)) : 0;
  dataLine += `${ageValue.toFixed(3)}\t`;  // toFixed is used to format the number with three decimal places
  
  // Add an empty '[BLANK]' field
  dataLine += `\t`;
  
  // Add 'OPPGAVESKÅRER', assuming 'gRawItemScoreString' holds the scores as a comma-separated string
  dataLine += `"${this.gRawItemScoreString}"\t`;
  
  // Add 'RASCHSKÅRE', formatted to three decimal places
  dataLine += `${this.gMeasure.toFixed(3)}\t`;
  
  // Add 'STANDARDFEIL', formatted to three decimal places
  dataLine += `${this.gSE.toFixed(3)}\t`;
  
  // Add 'MINESTIMERT' based on 'gIsMinEstimated'
  dataLine += `${this.gIsMinEstimated ? "1" : "0"}\t`;
  
  // Add 'MAKSESTIMERT' based on 'gIsMaxEstimated'
  dataLine += `${this.gIsMaxEstimated ? "1" : "0"}\t`;
  
  // Add 'ALDERSEKVIVALENT', assuming 'estimateToPresentText' is a method that converts a measure to text
  dataLine += `${this.estimateToPresentText(this.gMeasure)}\t`;
  
  // If 'gSE' is not -9999 and both 'gIsMinEstimated' and 'gIsMaxEstimated' are FALSE, calculate and add 'NEDRE GRENSE KONF.INT.' and 'ØVRE GRENSE KONF.INT.'
  if (this.gSE !== -9999 && !this.gIsMinEstimated && !this.gIsMaxEstimated) {
      let lowerBound = this.estimateToPresentText(this.gMeasure - 1.96 * this.gSE);
      let upperBound = this.estimateToPresentText(this.gMeasure + 1.96 * this.gSE);
      dataLine += `${lowerBound}\t${upperBound}\t`;
  } else {
      dataLine += `\t\t`;  // Adding two tabs for the empty fields
  }
  
  // Add 'MODELLBASERT PERSENTIL' if 'gAlder' is not -9999, assuming 'modellpersentilFraEstimat' and 'ageToMeasure' are methods for your calculations
  if (this.gAlder !== -9999) {
      let percentile = this.modellpersentilFraEstimat(this.gMeasure - this.ageToMeasure(this.gAlder, this.gConvertParameter1, this.gConvertParameter2));
      dataLine += `${percentile}\t`;
  }
  
  // Add 'FILFORMAT'
  dataLine += `${this.versionString}\t`;
  
  // Add a newline at the end to prepare for the next line of data
  dataLine += `\n`;
  
          }
  
          // Close the file
          await writableStream.close();
  
          // Reset for a new file
          this.nyFil();
  
      } catch (err) {
          console.error("There was an error", err);
      }
*/
  }

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

  // SECTION "-- ******************** INPUT AND DATA MANIPULATION FORM / UI ****************************"

  resetForm(): void {
    // This function should clear the user interface / the input data. It is called when a "new" file/case
    // is created (functionality: blank out the "navn"/note field, reset the "alder" and
    // "kjonn" fields to the default, and blank out the 50 item data fields -- in other words, start with
    // fresh data).
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
  // return a number only if the input was valid. This function is defined in the current code. If the age entered was in the
  // correct format, the global variable gAlder should be set to the return value of the function yearMonthToDec().
  //
  // The page "PrintPage1", the output display, had a "to handle enterPage" handler. This would be activated when the page
  // was opened, i.e., when the page was displayed. It sent three commands (i.e., called three functions) in turn, namely:
  //	send toggleCalcAE // which manipulates the way meny items are displayed based on the contents of the global array gIsValidAE[]
  //	send adjustShowRasch // which manipuletes the way a menu item is displayed based on the global variable "svShowRasch"
  //	send setGraph 0 // which is the script that contains the main functionality for creating/displaying the output (0 is a parameter)
}
