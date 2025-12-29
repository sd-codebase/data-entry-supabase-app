"use client";

import { formatTableContent } from "@/utils/formatter/table";
import { CompressOutlined, CopyOutlined, DeleteColumnOutlined } from "@ant-design/icons";
import MathExpressions from "@app/questions/components/question/math-expression";
import { Button, Card, Col, Input, message, Row, Typography } from "antd";
import { useEffect, useState } from "react";

const { TextArea } = Input;
const { Text, Title } = Typography;

export default function TableFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (input) {
      const transformedText = formatTableContent(input);
      setOutput(transformedText);
    } else {
      setOutput("");
    }
  }, [input]);

  // Remove consecutive \hline (same line or multiple lines), keep only one
  useEffect(() => {
    const consecutiveHlinePattern = /\\hline(\s*\\hline)+/g;
    if (consecutiveHlinePattern.test(output)) {
      setOutput(output.replace(consecutiveHlinePattern, "\\hline"));
    }
  }, [output]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      messageApi.success("Copied to clipboard!");
    } catch (err) {
      messageApi.error("Failed to copy text");
      console.error("Failed to copy text: ", err);
    }
  };

  const handleFlattenTables = () => {
    if (!input.trim()) {
      messageApi.warning("Please enter text first");
      return;
    }

    let text = input;

    // Find all \begin{tabular}{...} matches
    const beginMatches = Array.from(text.matchAll(/\\begin\{tabular\}(\{[^}]*\})?/g));
    // Find all \end{tabular} matches
    const endMatches = Array.from(text.matchAll(/\\end\{tabular\}/g));

    if (beginMatches.length <= 1 && endMatches.length <= 1) {
      messageApi.info("No inner tabular tags to remove");
      return;
    }

    // Remove inner \end{tabular} (all except last) - work backwards to preserve indices
    for (let i = endMatches.length - 2; i >= 0; i--) {
      const match = endMatches[i];
      text = text.slice(0, match.index) + text.slice(match.index! + match[0].length);
    }

    // Remove inner \begin{tabular} (all except first) - recalculate matches after previous removals
    const newBeginMatches = Array.from(text.matchAll(/\\begin\{tabular\}(\{[^}]*\})?/g));
    for (let i = newBeginMatches.length - 1; i >= 1; i--) {
      const match = newBeginMatches[i];
      text = text.slice(0, match.index) + text.slice(match.index! + match[0].length);
    }

    setInput(text);
    messageApi.success(`Removed ${beginMatches.length - 1} inner begin and ${endMatches.length - 1} inner end tabular tags`);
  };

  const handleStripMulticolumn = () => {
    if (!input.trim()) {
      messageApi.warning("Please enter text first");
      return;
    }

    // Replace \multicolumn{...}{...}{content} with just content
    const multicolumnRegex = /\\multicolumn\{[^}]*\}\{[^}]*\}\{([^}]*)\}/g;
    const matches = input.match(multicolumnRegex);

    if (!matches || matches.length === 0) {
      messageApi.info("No \\multicolumn found");
      return;
    }

    const newText = input.replace(multicolumnRegex, "& $1");
    setInput(newText);
    messageApi.success(`Replaced ${matches.length} \\multicolumn tags`);
  };

  return (
    <>
      {contextHolder}
      <Title level={2} style={{ padding: "16px 16px 0" }}>
        Table Formatter
      </Title>
      <Row gutter={16} style={{ padding: 16 }}>
        <Col span={8}>
          <Card
            title="Input"
            extra={
              <>
                <Button
                  onClick={handleFlattenTables}
                  size="small"
                  disabled={!input.trim()}
                  title="Flatten tables - remove inner tabular tags"
                  icon={<CompressOutlined />}
                  style={{ marginRight: 4 }}
                />
                <Button
                  onClick={handleStripMulticolumn}
                  size="small"
                  disabled={!input.trim()}
                  title="Strip multicolumn - keep only content"
                  icon={<DeleteColumnOutlined />}
                />
              </>
            }
          >
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
