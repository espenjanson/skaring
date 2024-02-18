import { Skaring } from "@/api/skaring";

const AgeEquivalents = ({ skaring }: { skaring: Skaring }) => {
  // x1: 845, y1: 7704, x2: 2240, y2: 7932

  const { x1, y1 } = skaring.convertVertices({ x1: 845, y1: 7704 });
  return (
    <>
      <text x={x1} y={y1} fill="#000" fontSize={"400"}>
        Hej
      </text>
    </>
  );
};

export const Chart = ({ raschScore }: { raschScore: number }) => {
  console.log(raschScore);
  const skaring = new Skaring();

  return (
    <div style={{ width: 500 }}>
      <svg width={"100%"} viewBox="0 0 21000 29700">
        <rect
          x="2000"
          y="2000"
          width="17000"
          height="25700"
          stroke="#000000"
          strokeWidth={10}
          fill="none"
        />
        <AgeEquivalents skaring={skaring} />
      </svg>
    </div>
  );
};
