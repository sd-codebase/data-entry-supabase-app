import React, { useEffect } from "react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";
import { Image } from "antd";

interface CellContentProps {
  exp: string;
}
const CellContent = ({ exp }: CellContentProps) => {
  const [snippets, setSnippets] = React.useState<Record<string, any>[]>([]);

  useEffect(() => {
    const snippets = splitContent(exp);
    console.log({ snippets });
    setSnippets(snippets);
  }, [exp]);

  function splitContent(content: string) {
    const regexToReplaceImgStart = "{{imgcell_";
    const regexToReplaceImgEnd = "_imgcell}}";
    const parts = content
      .replaceAll(regexToReplaceImgStart, "###IMG_URL_")
      .replaceAll(regexToReplaceImgEnd, "###")
      .split("###")
      .map((part) => {
        if (part.startsWith("IMG_URL_")) {
          const img = part.replace("IMG_URL_", "");
          return { type: "image", img };
        }
        return { type: "latex", latex: part };
      })
      .filter((part) => part.latex?.trim() || part.img?.trim());

    console.log({ cellParts: parts });
    return parts;
  }

  if (!snippets.length) return <td></td>;

  return (
    <td style={{ padding: "0.5rem" }}>
      {snippets?.map((snippet, index) => {
        if (snippet.type === "image") {
          return (
            <div key={index} style={{ margin: "1rem 0" }}>
              <Image
                height={100}
                width={"auto"}
                alt=""
                src={`${process.env.NEXT_PUBLIC_API_URL}/resources/assets/${snippet.img}`}
              />
            </div>
          );
        }
        return (
          <div key={index}>
            <Latex>{snippet.latex}</Latex>
          </div>
        );
      })}
    </td>
  );
};

export default CellContent;
