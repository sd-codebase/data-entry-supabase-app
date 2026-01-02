"use client";

import { supabaseBrowserClient } from "@utils/supabase/client";
import {
  Button,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Space,
  Tag,
  Typography,
} from "antd";
import React, { useEffect } from "react";

type QuestionsListJeeAdvancedInfoPropsType = {
  questions: Record<string, any>[];
};

const { Text } = Typography;

// Get color for question type tag
const getTypeColor = (type: string): string => {
  if (!type) return "default";
  const lowerType = type.toLowerCase();
  if (lowerType.includes("single")) return "blue";
  if (lowerType.includes("multiple")) return "purple";
  if (lowerType.includes("numerical") || lowerType.includes("integer")) return "orange";
  if (lowerType.includes("match")) return "cyan";
  if (lowerType.includes("subjective")) return "green";
  if (lowerType.includes("fill")) return "magenta";
  if (lowerType.includes("comprehension") || lowerType.includes("passage")) return "volcano";
  if (lowerType.includes("assertion")) return "gold";
  if (lowerType.includes("true") || lowerType.includes("false")) return "lime";
  return "default";
};

export const QuestionsListJeeAdvancedInfo = ({
  questions,
}: QuestionsListJeeAdvancedInfoPropsType) => {
  const totalQuestions = questions.length;
  const [startAndEndNo, setStartAndEndNo] = React.useState({
    start: 0,
    end: 0,
  });
  const [missingQuestions, setMissingQuestions] = React.useState<number[]>([]);
  const [repeatQuestions, setRepeatQuestions] = React.useState<number[]>([]);
  const [typeStats, setTypeStats] = React.useState<Record<string, number>>({});
  const [questionsWithParagraph, setQuestionsWithParagraph] = React.useState<number>(0);
  const [allQuestionNumbers, setAllQuestionNumbers] = React.useState<string>("");
  const [showAnswers, setShowAnswers] = React.useState(false);
  const [showLevels, setShowLevels] = React.useState(false);
  const [initialLevels, setInitialLevels] = React.useState({
    l1: "",
    l2: "",
    l3: "",
  });

  const [form] = Form.useForm();

  useEffect(() => {
    if (!allQuestionNumbers) {
      return;
    }

    const levels = allQuestionNumbers.split(", \n");
    levels.forEach((level, index) => {
      form.setFieldValue(`l${index + 1}`, level.trim());
    });
  }, [allQuestionNumbers, form]);

  useEffect(() => {
    if (questions.length === 0) {
      setTypeStats({});
      setQuestionsWithParagraph(0);
      return;
    }

    const numbers: number[] = questions.map((question) => {
      return Number(question.srNo);
    });

    const start = Math.min(...numbers);
    const end = Math.max(...numbers);
    setStartAndEndNo({ start, end });

    // Find missing questions
    const missing = [];
    for (let i = start; i <= end; i++) {
      if (!numbers.includes(i)) {
        missing.push(i);
      }
    }
    setMissingQuestions(missing);

    // Find repeat questions
    const repeat = numbers.filter((item, index) => {
      return numbers.indexOf(item) !== index;
    });
    setRepeatQuestions(repeat);

    // Calculate type statistics
    const stats: Record<string, number> = {};
    questions.forEach((q) => {
      const type = q.type || "Unknown";
      stats[type] = (stats[type] || 0) + 1;
    });
    setTypeStats(stats);

    // Count questions with paragraphs
    const withParagraph = questions.filter((q) => q.paragraphId).length;
    setQuestionsWithParagraph(withParagraph);

    // All question numbers for bulk level assignment (all types)
    const allNumbers = questions.map((item) => Number(item.srNo));
    setAllQuestionNumbers(allNumbers.join(", "));
  }, [questions]);

  const handleFinish = async (values: any) => {
    try {
      const { l1, l2, l3 } = values;
      const levelList: Record<string, any>[] = [];

      if (l1 && l1.split(",").length) {
        const l1Items = l1.split(",").map((qNo: string) => {
          const qId = questions.find((q) => q.srNo == qNo.trim())?.id;
          return qId;
        }).filter(Boolean);
        if (l1Items.length) {
          levelList.push({ level: 1, items: l1Items });
        }
      }
      if (l2 && l2.split(",").length) {
        const l2Items = l2.split(",").map((qNo: string) => {
          const qId = questions.find((q) => q.srNo == qNo.trim())?.id;
          return qId;
        }).filter(Boolean);
        if (l2Items.length) {
          levelList.push({ level: 2, items: l2Items });
        }
      }
      if (l3 && l3.split(",").length) {
        const l3Items = l3.split(",").map((qNo: string) => {
          const qId = questions.find((q) => q.srNo == qNo.trim())?.id;
          return qId;
        }).filter(Boolean);
        if (l3Items.length) {
          levelList.push({ level: 3, items: l3Items });
        }
      }

      for (const row of levelList) {
        await supabaseBrowserClient
          .from("questions")
          .update({ level: row.level })
          .in("id", row.items);
      }

      message.success("Levels updated successfully");
      setShowLevels(false);
      setInitialLevels({ l1: "", l2: "", l3: "" });
      form.resetFields();
    } catch (error) {
      console.error("Error updating levels:", error);
      message.error("Failed to update levels");
    }
  };

  if (!questions?.length) {
    return null;
  }

  return (
    <>
      <Flex gap={"1.5rem"} wrap="wrap">
        <Space direction="vertical">
          <h5>Total</h5>
          <Text>{totalQuestions}</Text>
        </Space>
        <Space direction="vertical">
          <h5>Questions</h5>
          <Text>
            Start: {startAndEndNo.start} End: {startAndEndNo.end}
          </Text>
        </Space>
        <Space direction="vertical">
          <h5>With Paragraph</h5>
          <Text>{questionsWithParagraph}</Text>
        </Space>
        <Space direction="vertical">
          <h5>Repeat Questions</h5>
          <Text>{repeatQuestions?.join(", ") || "None"}</Text>
        </Space>
        <Space direction="vertical">
          <h5>Missing Questions</h5>
          <Text>{missingQuestions?.join(", ") || "None"}</Text>
        </Space>
        <Space direction="vertical">
          <Button onClick={() => setShowAnswers(true)}>Answers</Button>
        </Space>
        <Space direction="vertical">
          <Button
            onClick={() => {
              setShowLevels(true);
              setInitialLevels({ l1: "", l2: "", l3: "" });
            }}
          >
            Levels
          </Button>
        </Space>
      </Flex>

      {/* Type Statistics */}
      <Flex gap={8} wrap="wrap" style={{ marginTop: "1rem" }}>
        {Object.entries(typeStats).map(([type, count]) => (
          <Tag key={type} color={getTypeColor(type)}>
            {type}: {count}
          </Tag>
        ))}
      </Flex>

      {/* Answers Modal */}
      <Modal
        title="Answers"
        open={showAnswers}
        onCancel={() => setShowAnswers(false)}
        footer={null}
        width={"80vw"}
      >
        <Flex wrap gap={16} style={{ paddingBottom: 300 }}>
          {questions.map((question, index) => {
            return (
              <Flex
                justify="end"
                key={index}
                style={{ minWidth: 120 }}
                vertical
              >
                <Tag color={getTypeColor(question.type)} style={{ marginBottom: 4 }}>
                  {question.type?.substring(0, 15) || "N/A"}
                </Tag>
                <Text
                  style={{
                    fontSize: 18,
                  }}
                >
                  {question.srNo}: {question.answer || "(No answer)"}
                </Text>
              </Flex>
            );
          })}
        </Flex>
      </Modal>

      {/* Levels Modal */}
      {showLevels && (
        <Modal
          title="Levels"
          open={showLevels}
          onCancel={() => {
            setShowLevels(false);
            setInitialLevels({ l1: "", l2: "", l3: "" });
          }}
          footer={null}
          width={"80vw"}
        >
          <Flex vertical>
            <Text>
              All Questions (for level assignment):{" "}
              <Input.TextArea
                rows={4}
                style={{ fontSize: 16, marginBottom: 16 }}
                value={allQuestionNumbers}
                onChange={(e) => setAllQuestionNumbers(e.target.value)}
              />
            </Text>
            <Flex vertical>
              <Form
                form={form}
                onFinish={handleFinish}
                initialValues={initialLevels}
              >
                <Flex vertical gap={16}>
                  <Form.Item label="L1" name="l1">
                    <Input placeholder="Enter question numbers separated by comma" />
                  </Form.Item>
                  <Form.Item label="L2" name="l2">
                    <Input placeholder="Enter question numbers separated by comma" />
                  </Form.Item>
                  <Form.Item label="L3" name="l3">
                    <Input placeholder="Enter question numbers separated by comma" />
                  </Form.Item>
                </Flex>
                <Button type="primary" htmlType="submit">
                  Update Levels
                </Button>
              </Form>
            </Flex>
          </Flex>
        </Modal>
      )}
    </>
  );
};
