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
  // HARALD: THIS SECTION CONTAINS SCRIPTS THAT PRODUCE, DISPLAY, AND MANIPULATE THE OUTPUT GRAPHIC(S). THEY ARE DEPENDENT ON BEING ABLE TO MANIPULATE
  // GRAHPIC OUTPUT ELEMENTS. THESE SCRIPTS HAVE NOT YET BEEN TRANSLATED.

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
    const aItemDifficulties: number[] =
      "-1.94,-1.38,-1.22,-0.68,-0.15,-0.36,0.43,1.27,2.24,2.06,-2.76,-1.7,-1.02,-0.8,-0.29,0.37,1.05,1.33,1.61,2.23,-2.54,-2.33,-1.72,-1.59,-1.35,-0.08,-0.37,1.6,1.49,1.49,-2.82,-1.89,-0.83,-0.22,-0.26,-0.12,1.31,1.62,1.93,2.4,-1.54,-1.43,-1.04,0.21,0.89,1.19,1.25,1.34,1.19,1.94"
        .split(",")
        .map(parseFloat);
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
        dMean += aItemDifficulties[i];
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
            h * (oldM - aItemDifficulties[i]) - partDenomPnij
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
            Math.exp(j * (oldM - aItemDifficulties[i]) - enumPnij) / denomPnij;
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
