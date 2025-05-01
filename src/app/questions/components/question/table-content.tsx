import React from "react";
import CellContent from "./cell-content";
import "./table.css";

const TableContent = ({ tableContent }: any) => {
  const [tableContentArray, setTableContentArray] = React.useState<
    Record<string, any>[]
  >([]);
  React.useEffect(() => {
    const tableContentArray = tableContent
      .split("\n\\hline\n")
      .map((row: string) => {
        const columns = row.split("&");
        return columns;
      });
    console.log(tableContentArray);
    setTableContentArray(tableContentArray);
  }, [tableContent]);

  if (!tableContentArray.length) return null;

  return (
    <table className="bordered">
      <tbody>
        {tableContentArray?.map((row, index) => (
          <tr key={index}>
            {row.map((column: string, indexCol: number) => (
              <CellContent exp={column} key={indexCol} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableContent;
