"use client"
import React, { useState } from "react"
import styled from "styled-components"

const FormWrapper = styled.div`
  /* Your styles here */
`

const Input = styled.input`
  /* Your styles here */
`

const Button = styled.button`
  /* Your styles here */
`

const Col = styled.div``

const Row = styled.div`
  display: flex;
`

interface ChildInfoProps {
  childInfo: {
    name: string
    gender: string
    testDate: string
    alder: string
  }
  setChildInfo: React.Dispatch<
    React.SetStateAction<ChildInfoProps["childInfo"]>
  >
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const ChildInfo: React.FC<ChildInfoProps> = ({
  childInfo,
  handleInputChange,
}) => {


  console.log(childInfo.alder)
  return <Col>
    <Input
      type="text"
      placeholder="Navn"
      name="name"
      value={childInfo.name}
      onChange={handleInputChange}
    />
    <Row>
      <Input
        type="radio"
        name="gender"
        value="boy"
        checked={childInfo.gender === "boy"}
        onChange={handleInputChange}
      />
      Gutt
      <Input
        type="radio"
        name="gender"
        value="girl"
        checked={childInfo.gender === "girl"}
        onChange={handleInputChange}
      />
      Jente

      <Input
        type="text"
        name="alder.years"
        value={childInfo.alder.split(":")[0] || ''}
        onChange={handleInputChange}
      />
            <Input
        type="text"
        name="alder.months"
        value={childInfo.alder.split(":")[1] || ''}
        onChange={handleInputChange}
      />
    </Row>
  </Col>
  
}


function translateColumnIndexToQuestionSegment(idx: number) {
  const letters = "ABCDE"
  return letters[idx]
}

interface TestDetailsProps {
  testInput: { [key: string]: string }
  handleTestInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const TestDetails: React.FC<TestDetailsProps> = ({
  testInput,
  handleTestInputChange,
}) => (
  <Row>
    {[...Array(5).keys()].map((col) => (
      <div key={col}>
        {[...Array(10).keys()].map((row) => 
          {
            const label =               translateColumnIndexToQuestionSegment(col) +
            (row + 1)
          return <div key={`col${col}row${row}`}>
            <label>
{label}
            </label>
            <Input
              type="text"
              maxLength={1}
              name={label}
              value={testInput[label] || ""}
              onChange={handleTestInputChange}
            />
          </div>
          }
        )}
      </div>
    ))}
  </Row>
)

function getDefaultChildInfo() {
  return {
    name: "",
    gender: "",
    testDate: new Date().toISOString().substring(0, 10),
    alder: "",
  }
}

const Page: React.FC = () => {
  const [childInfo, setChildInfo] = useState(getDefaultChildInfo())
  const [testInput, setTestInput] = useState<{ [key: string]: string }>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setChildInfo(prevState => {
      let value = e.target.value
      let name = e.target.name

    
      if (e.target.name === "alder.years") {
        name = "alder"

        value = value + ":" + (prevState.alder.split(":")[1] || '')
  
      } else if (e.target.name === "alder.months") {
        name = "alder"
        value =  (prevState.alder.split(":")[0] ||'') + ":" + value
      }

      return {...childInfo, [name]: value }})
  }

  const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTestInput({ ...testInput, [e.target.name]: e.target.value })
  }

  const handleClear = () => {
    setChildInfo(getDefaultChildInfo())
    setTestInput({})
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log(childInfo, testInput)
  }

  console.log(testInput)

  return (
    <FormWrapper>
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
        <Button type="button" onClick={handleClear}>
          Tøm skjema
        </Button>
        <Button type="submit">Vis resultat</Button>
      </form>
    </FormWrapper>
  )
}

export default Page
