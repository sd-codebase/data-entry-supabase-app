import React, { use, useEffect } from "react";
import "katex/dist/katex.min.css";
import Latex from "react-latex-next";
import { Image } from "antd";
import TableContent from "./table-content";

const MathExpressions = ({ exp }: { exp: string }) => {
  const [snippets, setSnippets] = React.useState<Record<string, any>[]>([]);
  const filespath = localStorage.getItem("filespath");
  const fileshost = `${process.env.NEXT_PUBLIC_RESOURCE_BUCKET_URL}/${filespath}`;

  useEffect(() => {
    const snippets = splitContent(exp);
    console.log({ snippets });
    setSnippets(snippets);
  }, [exp]);

  function splitContent(content: string) {
    const regexToReplaceImgStart = "{{img_";
    const regexToReplaceImgEnd = "_img}}";
    const regexToReplaceTableStart = "{{table_";
    const regexToReplaceTableEnd = "_table}}";
    const parts = content
      .replaceAll("\\nl", "###")
      .replaceAll(regexToReplaceImgStart, "###IMG_URL_")
      .replaceAll(regexToReplaceImgEnd, "###")
      .replaceAll(regexToReplaceTableStart, "###TABEL_")
      .replaceAll(regexToReplaceTableEnd, "###")
      .split("###")
      .map((part) => {
        if (part.startsWith("IMG_URL_")) {
          const img = part.replace("IMG_URL_", "");
          return { type: "image", img };
        } else if (part.startsWith("TABEL_")) {
          const tblContent = part.replace("TABEL_", "");
          return { type: "table", tblContent };
        }
        if (part.trim() === "") {
          return { type: "empty" };
        }
        return { type: "latex", latex: part };
      });
    // .filter(
    //   (part) => part.latex || part.img?.trim() || part.tblContent?.trim()
    // );

    console.log(parts);
    return parts;
  }

  if (!snippets.length) return null;

  return (
    <div
      style={{ border: "1px solid #ccc", padding: "0.25rem", width: "300px" }}
    >
      {snippets?.map((snippet, index) => {
        if (snippet.type === "image") {
          return (
            <div key={index} style={{ margin: "1rem 0" }}>
              <Image
                height={100}
                width={"auto"}
                alt=""
                src={`${fileshost}/${snippet.img}`}
              />
            </div>
          );
        } else if (snippet.type === "table") {
          return <TableContent key={index} tableContent={snippet.tblContent} />;
        } else if (snippet.type === "empty") {
          return <div key={index} style={{ height: "16px", width: "16px" }} />;
        }
        return (
          <div key={index}>
            <Latex>{snippet.latex}</Latex>
          </div>
        );
      })}
    </div>
  );
};

export default MathExpressions;
