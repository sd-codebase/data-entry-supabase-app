export const formatTableContent = (input: string): string => {
  if (!input) return "";

  let inputStr = input;
  const tableRegex =
    /\\begin{center}([\s\S]*?)\\begin{tabular}\n([\s\S]*?)\n\\end{tabular}([\s\S]*?)\\end{center}/g;
  const tableRegex2 = /\\begin{tabular}\n([\s\S]*?)\n\\end{tabular}/g;

  return inputStr

    .replace(/\\begin{tabular}\{.*?\}/g, "\\begin{tabular}")
    .replace(/\\\\/g, "")
    .replace(
      /\\includetblgraphics\[.*?\]\{(.*?)\}/g,
      "{{imgcell_$1.jpg_imgcell}}"
    )
    .replace(
      /(\\begin{tabular}.*?)([\s\S]*?)(\\end{tabular})/g,
      (_, start, body, end) => {
        const modifiedBody = body
          .replace(/\n\\hline\n/g, "\n")
          .replace(/\n/g, "\n\\hline\n");
        return `${start}${modifiedBody}${end}`;
      }
    )
    .replace(/\\begin{tabular}\n\\hline/g, "\\begin{tabular}")
    .replace(/\\hline\n\\end{tabular}/g, "\\end{tabular}")
    .replace(tableRegex, "{{table_$2_table}}")
    .replace(tableRegex2, "{{table_$1_table}}")
    .replace(/\\multicolumn{(\d+)}{c}/g, (_, num) => {
      const count = parseInt(num) - 1;
      return "& ".repeat(count);
    })

    .replace("{List I}", "List I")
    .replace("{List II}", "List II")
    .replace(/\n(\d+)/g, "\n $1");
};

export const parseTableContent = (tableContent: string): string[][] => {
  return tableContent.split("\n\\hline\n").map((row: string) => row.split("&"));
};
