"use client";

import DropdownFilters from "@/components/dropdown-filters/dropdown-filters";
import { CopyOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Card, Collapse, Flex, Input, Modal, Typography, message } from "antd";
import React, { useEffect, useState } from "react";

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Chapter {
  order_num: number;
  name: string;
  topics: string[];
}

interface Subject {
  name: string;
  chapters: Chapter[];
}

interface IndexData {
  course: string;
  subjects: Subject[];
}

const MpscgsChapterQuestionsContainer = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [indexData, setIndexData] = useState<IndexData | null>(null);

  useEffect(() => {
    fetch("/mpsc-index.json")
      .then((res) => res.json())
      .then((data) => setIndexData(data))
      .catch((err) => console.error("Failed to load index:", err));
  }, []);

  const handleFilterSubmit = (values: Record<string, any>) => {
    setFilters(values);
  };

  const handleCopyChapter = (chapterName: string) => {
    navigator.clipboard.writeText(chapterName);
    message.success(`Copied: ${chapterName}`);
  };

  const collapseItems = indexData?.subjects.map((subject, index) => ({
    key: index.toString(),
    label: <Text strong>{subject.name}</Text>,
    children: (
      <Flex vertical gap={4}>
        {subject.chapters.map((chapter) => (
          <Flex key={chapter.order_num} align="center" gap={4}>
            <Text>
              {chapter.order_num}. {chapter.name}
            </Text>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyChapter(chapter.name)}
            />
          </Flex>
        ))}
      </Flex>
    ),
  }));

  return (
    <Flex vertical gap={16} style={{ padding: 16 }}>
      <Flex justify="space-between" align="center">
        <Title level={3} style={{ margin: 0 }}>MPSC GS Chapter Questions</Title>
        <Button
          icon={<UnorderedListOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Chapter Index
        </Button>
      </Flex>

      {filters?.chapter && (
        <Text strong>
          Selected Chapter: {filters.chapter.name}
        </Text>
      )}

      <Card title="Filters">
        <DropdownFilters
          handleFilterSubmit={handleFilterSubmit}
          noTopic={true}
        />
      </Card>

      <Card title="Input">
        <TextArea
          rows={20}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste input text here..."
        />
      </Card>

      <Card title="Output">
        <TextArea
          rows={20}
          value={outputText}
          onChange={(e) => setOutputText(e.target.value)}
          placeholder="Output will appear here..."
        />
      </Card>

      <Modal
        title="MPSC GS Chapter Index"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        {indexData && (
          <Collapse items={collapseItems} accordion />
        )}
      </Modal>
    </Flex>
  );
};

export default MpscgsChapterQuestionsContainer;
