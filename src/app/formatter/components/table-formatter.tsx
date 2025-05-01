"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, message, Row, Col, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import MathExpressions from "@app/questions/components/question/math-expression";

const { TextArea } = Input;
const { Text, Title } = Typography;

export default function TableFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (input) {
      let inputStr = input;

      //   inputStr = inputStr.replace(/\n/g, "\n\\hline\n");
      const tableRegex =
        /\\begin{center}([\s\S]*?)\\begin{tabular}\n([\s\S]*?)\n\\end{tabular}([\s\S]*?)\\end{center}/g;
      const tableRegex2 = /\\begin{tabular}\n([\s\S]*?)\n\\end{tabular}/g;
      const transformedText = inputStr
        .replace(/\\begin{tabular}\{.*?\}/g, "\\begin{tabular}")
        .replace(/\\begin{tabular}\n\\hline/g, "\\begin{tabular}")
        .replace(/\\hline\n\\end{tabular}/g, "\\end{tabular}")
        .replace(/\\\\/g, "")
        .replace(
          /\\includetblgraphics\[.*?\]\{(.*?)\}/g,
          "{{imgcell_$1.jpg_imgcell}}"
        )
        .replace(tableRegex, "{{table_$2_table}}")
        .replace(tableRegex2, "{{table_$1_table}}")
        .replace(/\\multicolumn{(\d+)}{c}/g, (_, num) => {
          const count = parseInt(num) - 1;
          return "& ".repeat(count);
        })
        .replace(/\n\\hline\n/g, "\n") // only work for table
        .replace(/\n/g, "\n\\hline\n") //only work for table snippet
        .replace("{List I}", "List I")
        .replace("{List II}", "List II")
        .replace(/\n(\d+)/g, "\n $1");

      setOutput(transformedText);
    } else {
      setOutput("");
    }
  }, [input]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success("Copied to clipboard!");
    } catch (err) {
      messageApi.error("Failed to copy text");
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <>
      {contextHolder}
      <Title level={2} style={{ padding: "16px 16px 0" }}>
        Table
      </Title>
      <Row gutter={16} style={{ padding: 16 }}>
        <Col span={8}>
          <Card title="Input">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your table data here..."
              style={{ height: 500, resize: "none" }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title="Output"
            extra={
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(output)}
              >
                Copy
              </Button>
            }
          >
            <TextArea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="Formatted output will appear here..."
              style={{ height: 500, resize: "none" }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Preview">
            <div
              style={{
                minHeight: 500,
                padding: 16,
                borderRadius: 8,
              }}
            >
              {output ? <MathExpressions exp={output} /> : null}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
