import React from "react";
import CellContent from "./cell-content";

const TableContent = ({ tableContent }: any) => {
  const [tableContentArray, setTableContentArray] = React.useState<
    Record<string, any>[]
  >([]);
  React.useEffect(() => {
    const tableContentArray = tableContent
      .split("\n\\S\\hline\\S\n")
      .map((row: string) => {
        const columns = row.split("&");
        return columns;
      });
    console.log(tableContentArray);
    setTableContentArray(tableContentArray);
  }, [tableContent]);

  if (!tableContentArray.length) return null;

  return (
    <table>
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
