"use client";

import { formatTableContent } from "@/utils/formatter/table";
import { CopyOutlined } from "@ant-design/icons";
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
        Table Formatter
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
