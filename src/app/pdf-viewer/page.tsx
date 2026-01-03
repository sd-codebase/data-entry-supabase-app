"use client";

import { useState } from "react";
import { Upload, Button, Typography, Flex, Card } from "antd";
import { FilePdfOutlined, UploadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function PdfViewer() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = (file: File) => {
    if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setFileName(file.name);
    }
    return false; // Prevent upload
  };

  const handleClear = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    setFileName("");
  };

  return (
    <Flex vertical gap={16} style={{ height: "100%", padding: 16 }}>
      <Flex justify="space-between" align="center">
        <Title level={4} style={{ margin: 0 }}>
          <FilePdfOutlined /> PDF Viewer
        </Title>
        {pdfUrl && (
          <Button danger onClick={handleClear}>
            Clear
          </Button>
        )}
      </Flex>

      {!pdfUrl ? (
        <Card>
          <Flex vertical align="center" gap={16} style={{ padding: 40 }}>
            <FilePdfOutlined style={{ fontSize: 64, color: "#1890ff" }} />
            <Text type="secondary">Select a PDF file to view</Text>
            <Upload
              accept=".pdf"
              showUploadList={false}
              beforeUpload={handleFileSelect}
            >
              <Button type="primary" icon={<UploadOutlined />} size="large">
                Select PDF File
              </Button>
            </Upload>
          </Flex>
        </Card>
      ) : (
        <Flex vertical gap={8} style={{ flex: 1 }}>
          <Text type="secondary">Viewing: {fileName}</Text>
          <iframe
            src={pdfUrl}
            style={{
              width: "100%",
              height: "calc(100vh - 200px)",
              border: "1px solid #d9d9d9",
              borderRadius: 8,
            }}
            title="PDF Viewer"
          />
        </Flex>
      )}
    </Flex>
  );
}
