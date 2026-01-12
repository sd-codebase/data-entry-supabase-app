"use client";

import DropdownFilters from "@/components/dropdown-filters/dropdown-filters";
import { supabaseBrowserClient } from "@/utils/supabase/client";
import {
  CopyOutlined,
  SaveOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Collapse,
  Divider,
  Flex,
  Input,
  Modal,
  Typography,
  message,
} from "antd";
import React, { useEffect, useRef, useState } from "react";

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

interface QuestionInput {
  sr_no: string;
  question: string;
  year: string;
  options: Record<string, string>;
  answer: string;
  level: string;
}

interface QuestionEditable {
  sr_no: number;
  question: string;
  pyo: string;
  options: { "1": string; "2": string; "3": string; "4": string };
  answer: string;
  level: string;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case "1": return "#52c41a"; // green
    case "2": return "#faad14"; // yellow
    case "3": return "#fa8c16"; // orange
    default: return undefined;
  }
};

const renderTextWithLineBreaks = (text: string): React.ReactNode => {
  const lines = text.split("\n");
  if (lines.length === 1) return text;

  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

const renderTextWithTable = (text: string) => {
  const tableRegex = /\{\{table_([\s\S]*?)_table\}\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tableRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex}>
          {renderTextWithLineBreaks(text.slice(lastIndex, match.index))}
        </span>
      );
    }

    const tableContent = match[1].trim();
    const rows = tableContent.split("\\hline").filter((row) => row.trim());

    parts.push(
      <table
        key={match.index}
        style={{
          borderCollapse: "collapse",
          margin: "8px 0",
          fontSize: 15,
        }}
      >
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.split("&").map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    border: "1px solid #d9d9d9",
                    padding: "4px 8px",
                    fontWeight: rowIndex === 0 ? "bold" : "normal",
                  }}
                >
                  {cell.trim()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={lastIndex}>
        {renderTextWithLineBreaks(text.slice(lastIndex))}
      </span>
    );
  }

  return parts.length > 0 ? parts : renderTextWithLineBreaks(text);
};

const MpscgsChapterQuestionsContainer = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [inputText, setInputText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [indexData, setIndexData] = useState<IndexData | null>(null);

  const [questions, setQuestions] = useState<QuestionEditable[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [jsonError, setJsonError] = useState<string>("");
  const [scratchText, setScratchText] = useState("");
  const scratchRef = useRef<any>(null);

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

  const handleFormat = () => {
    setJsonError("");
    try {
      const parsed: QuestionInput[] = JSON.parse(inputText);
      if (!Array.isArray(parsed)) {
        setJsonError("Input must be a JSON array");
        message.error("Input must be a JSON array");
        return;
      }

      const formatted: QuestionEditable[] = parsed.map((q) => ({
        sr_no: parseInt(q.sr_no) || 0,
        question: q.question || "",
        pyo: q.year || "",
        options: {
          "1": q.options?.["1"] || "",
          "2": q.options?.["2"] || "",
          "3": q.options?.["3"] || "",
          "4": q.options?.["4"] || "",
        },
        answer: q.answer || "",
        level: q.level || "1",
      }));

      // Validate each question
      const errors: string[] = [];
      formatted.forEach((q, index) => {
        const qNum = q.sr_no || index + 1;
        if (!q.sr_no) errors.push(`Q${qNum}: Sr No is empty`);
        if (!q.question.trim()) errors.push(`Q${qNum}: Question is empty`);
        if (!q.options["1"].trim()) errors.push(`Q${qNum}: Option 1 is empty`);
        if (!q.options["2"].trim()) errors.push(`Q${qNum}: Option 2 is empty`);
        if (!q.options["3"].trim()) errors.push(`Q${qNum}: Option 3 is empty`);
        if (!q.options["4"].trim()) errors.push(`Q${qNum}: Option 4 is empty`);
        if (!q.pyo.trim()) errors.push(`Q${qNum}: Year is empty`);
        if (!q.answer.trim()) errors.push(`Q${qNum}: Answer is empty`);
        if (!q.level.trim()) errors.push(`Q${qNum}: Level is empty`);
      });

      setValidationErrors(errors);
      setQuestions(formatted);

      if (errors.length > 0) {
        message.warning(`Parsed ${formatted.length} questions with ${errors.length} issues`);
      } else {
        message.success(`Parsed ${formatted.length} questions`);
      }
    } catch (err: any) {
      console.error("JSON Parse Error:", err);
      const errorMsg = err.message || "Unknown error";
      setJsonError(errorMsg);
      message.error(`Invalid JSON: ${errorMsg}`);
    }
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionEditable,
    value: any
  ) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOption = (index: number, key: "1" | "2" | "3" | "4", value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        options: { ...updated[index].options, [key]: value },
      };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!filters?.topic) {
      message.error("Please select a topic first");
      return;
    }

    if (questions.length === 0) {
      message.warning("No questions to save");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabaseBrowserClient.from("questions").insert(
        questions.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          sr_no: q.sr_no,
          pyo: q.pyo,
          level: parseInt(q.level) || 1,
          topic_id: filters.topic.id,
        }))
      );

      if (error) {
        console.error(error);
        message.error(error.message || "Error saving questions");
        return;
      }

      message.success(`${questions.length} questions saved successfully!`);
      setQuestions([]);
      setInputText("");
    } catch (err) {
      message.error("Failed to save questions");
    } finally {
      setIsSaving(false);
    }
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
        <Title level={3} style={{ margin: 0 }}>
          MPSC GS Chapter Questions
        </Title>
        <Button
          icon={<UnorderedListOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Chapter Index
        </Button>
      </Flex>

      {filters?.chapter && (
        <Text strong>Selected Chapter: {filters.chapter.name}</Text>
      )}
      {filters?.topic && (
        <Text type="success">Selected Topic: {filters.topic.name}</Text>
      )}

      <Card title="Filters">
        <DropdownFilters handleFilterSubmit={handleFilterSubmit} />
      </Card>

      <Collapse
        items={[
          {
            key: "scratch",
            label: "Scratch Pad",
            children: (
              <Flex vertical gap={8}>
                <Flex gap={8} wrap="wrap">
                  <Button
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(scratchText);
                      message.success("Copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    onClick={async () => {
                      const text = await navigator.clipboard.readText();
                      setScratchText(text);
                      message.success("Pasted from clipboard");
                    }}
                  >
                    Paste
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setScratchText("");
                      message.success("Cleared");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText("{{table_  _table}}");
                      message.success("Copied: {{table_  _table}}");
                    }}
                  >
                    {"{{table}}"}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText("\\hline");
                      message.success("Copied: \\hline");
                    }}
                  >
                    \hline
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      const textarea = scratchRef.current?.resizableTextArea?.textArea;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const selectedText = scratchText.substring(start, end);
                        if (selectedText) {
                          const newText =
                            scratchText.substring(0, start) +
                            "[[ts]]" + selectedText + "[[te]]" +
                            scratchText.substring(end);
                          setScratchText(newText);
                          message.success("Wrapped with [[ts]]...[[te]]");
                        } else {
                          message.warning("No text selected");
                        }
                      }
                    }}
                  >
                    [[ts]]...[[te]]
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      navigator.clipboard.writeText(scratchText);
                      message.success("Copied all content");
                    }}
                  >
                    Copy All
                  </Button>
                </Flex>
                <TextArea
                  ref={scratchRef}
                  rows={6}
                  value={scratchText}
                  onChange={(e) => setScratchText(e.target.value)}
                  placeholder="Scratch pad for notes, formatting, etc..."
                />
              </Flex>
            ),
          },
        ]}
      />

      <Card
        title="Input JSON"
        extra={
          <Flex gap={8}>
            <Button
              onClick={() => {
                navigator.clipboard.writeText("[[has table]]");
                message.success("Copied: [[has table]]");
              }}
            >
              [[has table]]
            </Button>
            <Button type="primary" onClick={handleFormat}>
              Format
            </Button>
          </Flex>
        }
      >
        <TextArea
          rows={10}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setJsonError("");
          }}
          placeholder='Paste JSON array here... [{"sr_no": "1", "question": "...", "year": "...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "answer": "1", "level": "1"}]'
        />
        {jsonError && (
          <Card
            size="small"
            style={{ marginTop: 12, backgroundColor: "#fff2f0", borderColor: "#ffccc7" }}
          >
            <Text type="danger" strong>JSON Error: </Text>
            <Text type="danger">{jsonError}</Text>
          </Card>
        )}
        {validationErrors.length > 0 && (
          <Card
            size="small"
            style={{ marginTop: 12, backgroundColor: "#fff2f0", borderColor: "#ffccc7" }}
            title={
              <Text type="danger" strong>
                Validation Errors ({validationErrors.length})
              </Text>
            }
          >
            <Flex vertical gap={4} style={{ maxHeight: 150, overflowY: "auto" }}>
              {validationErrors.map((err, idx) => (
                <Text key={idx} type="danger" style={{ fontSize: 13 }}>
                  {err}
                </Text>
              ))}
            </Flex>
          </Card>
        )}
      </Card>

      {questions.length > 0 && (
        <>
          <Card
            title={`All Questions (${questions.length})`}
            extra={
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={isSaving}
                disabled={!filters?.topic}
              >
                Save {questions.length} Questions
              </Button>
            }
          >
            <Flex
              vertical
              gap={16}
              style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}
            >
              {questions.map((q, index) => (
                <Card
                  key={index}
                  size="small"
                  title={
                    <Flex align="center" gap={8}>
                      <span>Question {index + 1}</span>
                      <span
                        style={{
                          backgroundColor: getLevelColor(q.level),
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        L{q.level}
                      </span>
                    </Flex>
                  }
                >
                  <Flex gap={24}>
                    {/* Editable Column */}
                    <Flex vertical gap={8} style={{ flex: 1 }}>
                      <Flex gap={8}>
                        <div style={{ flex: 1 }}>
                          <Text strong>Sr No:</Text>
                          <Input
                            value={q.sr_no}
                            onChange={(e) =>
                              updateQuestion(index, "sr_no", parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text strong>Answer:</Text>
                          <Input
                            value={q.answer}
                            onChange={(e) =>
                              updateQuestion(index, "answer", e.target.value)
                            }
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text strong>Level:</Text>
                          <Input
                            value={q.level}
                            onChange={(e) =>
                              updateQuestion(index, "level", e.target.value)
                            }
                            style={{ borderColor: getLevelColor(q.level) }}
                          />
                        </div>
                        <div style={{ flex: 2 }}>
                          <Text strong>Year (PYO):</Text>
                          <Input
                            value={q.pyo}
                            onChange={(e) =>
                              updateQuestion(index, "pyo", e.target.value)
                            }
                          />
                        </div>
                      </Flex>
                      <div>
                        <Text strong>Question:</Text>
                        <TextArea
                          rows={3}
                          value={q.question}
                          onChange={(e) =>
                            updateQuestion(index, "question", e.target.value)
                          }
                        />
                      </div>
                      <Flex gap={8}>
                        <div style={{ flex: 1 }}>
                          <Text strong>1:</Text>
                          <Input
                            value={q.options["1"]}
                            onChange={(e) => updateOption(index, "1", e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text strong>2:</Text>
                          <Input
                            value={q.options["2"]}
                            onChange={(e) => updateOption(index, "2", e.target.value)}
                          />
                        </div>
                      </Flex>
                      <Flex gap={8}>
                        <div style={{ flex: 1 }}>
                          <Text strong>3:</Text>
                          <Input
                            value={q.options["3"]}
                            onChange={(e) => updateOption(index, "3", e.target.value)}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text strong>4:</Text>
                          <Input
                            value={q.options["4"]}
                            onChange={(e) => updateOption(index, "4", e.target.value)}
                          />
                        </div>
                      </Flex>
                    </Flex>

                    <Divider type="vertical" style={{ height: "auto" }} />

                    {/* Preview Column */}
                    <Flex vertical style={{ flex: 1, fontSize: 16 }}>
                      <div>
                        <Text strong style={{ fontSize: 16 }}>Q{q.sr_no}.</Text>{" "}
                        {renderTextWithTable(q.question)}
                      </div>
                      <Text type="secondary" style={{ fontSize: 14 }}>[{q.pyo}]</Text>
                      <Divider style={{ margin: "8px 0" }} />
                      <Flex vertical gap={4}>
                        {(["1", "2", "3", "4"] as const).map((opt) => (
                          <div
                            key={opt}
                            style={{
                              color: q.answer === opt ? "green" : undefined,
                              fontWeight: q.answer === opt ? "bold" : undefined,
                              fontSize: 15,
                            }}
                          >
                            ({opt}) {renderTextWithTable(q.options[opt])}
                          </div>
                        ))}
                      </Flex>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Card>
        </>
      )}

      <Modal
        title="MPSC GS Chapter Index"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        {indexData && <Collapse items={collapseItems} accordion />}
      </Modal>
    </Flex>
  );
};

export default MpscgsChapterQuestionsContainer;
