"use client";
import { Skaring } from "@/api/skaring";
import { Chart } from "@/components/Chart";
import React, { useState } from "react";

interface ChildInfoProps {
  childInfo: {
    name: string;
    gender: string;
    testDate: string;
    alder: string;
  };
  setChildInfo: React.Dispatch<
    React.SetStateAction<ChildInfoProps["childInfo"]>
  >;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChildInfo: React.FC<ChildInfoProps> = ({
  childInfo,
  handleInputChange,
}) => {
  console.log(childInfo.alder);
  return (
    <div>
      <input
        type="text"
        placeholder="Navn"
        name="name"
        value={childInfo.name}
        onChange={handleInputChange}
      />
      <div>
        <input
          type="radio"
          name="gender"
          value="boy"
          checked={childInfo.gender === "boy"}
          onChange={handleInputChange}
        />
        Gutt
        <input
          type="radio"
          name="gender"
          value="girl"
          checked={childInfo.gender === "girl"}
          onChange={handleInputChange}
        />
        Jente
        <input
          type="text"
          name="alder.years"
          value={childInfo.alder.split(":")[0] || ""}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="alder.months"
          value={childInfo.alder.split(":")[1] || ""}
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};

function translateColumnIndexToQuestionSegment(idx: number) {
  const letters = "ABCDE";
  return letters[idx];
}

interface TestDetailsProps {
  testInput: { [key: string]: string };
  handleTestInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TestDetails: React.FC<TestDetailsProps> = ({
  testInput,
  handleTestInputChange,
}) => (
  <div>
    {[...Array(5).keys()].map((col) => (
      <div className="row" key={col}>
        {[...Array(10).keys()].map((row) => {
          const label = translateColumnIndexToQuestionSegment(col) + (row + 1);
          return (
            <div key={`col${col}row${row}`}>
              <label>{label}</label>
              <input
                type="text"
                maxLength={1}
                name={label}
                value={testInput[label] || ""}
                onChange={handleTestInputChange}
              />
            </div>
          );
        })}
      </div>
    ))}
  </div>
);

function getDefaultChildInfo() {
  return {
    name: "",
    gender: "",
    testDate: new Date().toISOString().substring(0, 10),
    alder: "",
  };
}

const Page: React.FC = () => {
  const [childInfo, setChildInfo] = useState(getDefaultChildInfo());
  const [testInput, setTestInput] = useState<{ [key: string]: string }>({
    A7: "2",
    A8: "2",
    A9: "1",
    A10: "0",
    B5: "2",
    B6: "1",
    B7: "1",
    B8: "0",
    B9: "0",
    C6: "1",
    C7: "1",
    C8: "0",
    C9: "0",
    D6: "2",
    D7: "1",
    D8: "0",
    D9: "0",
    E6: "2",
    E7: "2",
    E8: "0",
    E9: "0",
  });
  const [raschScore, setRaschScore] = useState(0);
  const skaring = new Skaring();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChildInfo((prevState) => {
      let value = e.target.value;
      let name = e.target.name;

      if (e.target.name === "alder.years") {
        name = "alder";

        value = value + ":" + (prevState.alder.split(":")[1] || "");
      } else if (e.target.name === "alder.months") {
        name = "alder";
        value = (prevState.alder.split(":")[0] || "") + ":" + value;
      }

      return { ...childInfo, [name]: value };
    });
  };

  const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTestInput({ ...testInput, [e.target.name]: e.target.value });
  };

  const handleClear = () => {
    setChildInfo(getDefaultChildInfo());
    setTestInput({});
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("TEST SUBMITTED", childInfo, testInput);
    skaring.prepareInputForOutput(testInput);
    setRaschScore(skaring.gMeasure);
    console.log(skaring.aldersgruppepersentilerFraEstimat(skaring.gMeasure));
  };

  return (
    <div>
      <h1>Skåring av motoriske oppgaver i NUBU 4-16</h1>
      <form onSubmit={handleSubmit}>
        <ChildInfo
          childInfo={childInfo}
          handleInputChange={handleInputChange}
          setChildInfo={setChildInfo}
        />
        <TestDetails
          testInput={testInput}
          handleTestInputChange={handleTestInputChange}
        />
        <button type="button" onClick={handleClear}>
          Tøm skjema
        </button>
        <button type="submit">Vis resultat</button>
      </form>

      <Chart raschScore={raschScore} />
    </div>
  );
};

export default Page;
