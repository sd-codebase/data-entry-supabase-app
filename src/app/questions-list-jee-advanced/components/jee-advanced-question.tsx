"use client";

import {
  Badge,
  Button,
  Card,
  Flex,
  Input,
  message,
  Radio,
  Tag,
  Typography,
} from "antd";
import { supabaseBrowserClient } from "@utils/supabase/client";
import MathExpression from "@app/questions/components/question/math-expression";
import { useEffect, useState } from "react";
import { TextAreaWithImageTools } from "@components/textarea-with-image-tools";
import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

interface JeeAdvancedQuestionProps {
  question: any;
  handleUpdate?: (question: any) => void;
  isUpdatedQuestion?: boolean;
  topicId?: string;
  topicNumber?: number;
  onlyPreview?: boolean;
}

const { Text, Title } = Typography;
const { TextArea } = Input;

// Types that have options (a, b, c, d)
const TYPES_WITH_OPTIONS = [
  "Single Correct",
  "Multiple Correct",
  "Assertion Reason/Statement Based",
  "Match the Column",
  "Comprehension Based/Passage Based",
];

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

// Check if type should have options
const hasOptionsForType = (type: string): boolean => {
  if (!type) return false;
  return TYPES_WITH_OPTIONS.some(t =>
    type.toLowerCase().includes(t.toLowerCase())
  );
};

// Check if type is True/False
const isTrueFalseType = (type: string): boolean => {
  if (!type) return false;
  return type.toLowerCase().includes("true") || type.toLowerCase().includes("false");
};

export const JeeAdvancedQuestion = ({
  question,
  handleUpdate,
  isUpdatedQuestion,
  topicId,
  topicNumber,
  onlyPreview = false,
}: JeeAdvancedQuestionProps) => {
  const [que, setQue] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const [paragraphContent, setParagraphContent] = useState<string>("");

  useEffect(() => {
    if (question) {
      const processed = processQuestion(question);
      setQue(processed);
      setParagraphContent(question.paragraphContent || "");
    } else {
      setQue(null);
      setParagraphContent("");
    }
  }, [question]);

  const processQuestion = (data: any) => {
    const hasOptions = hasOptionsForType(data.type);

    // Only add empty options if type requires options
    if (hasOptions && !data.options) {
      data.options = { a: "", b: "", c: "", d: "" };
    } else if (hasOptions && data.options) {
      data.options = { a: "", b: "", c: "", d: "", ...data.options };
    }

    if (!data?.solutions?.length) {
      data.solutions = [""];
    }
    return data;
  };

  const reloadQuestion = async () => {
    if (que.id) {
      try {
        const { data, error } = await supabaseBrowserClient
          .from("questions")
          .select("*, paragraphs(id, content)")
          .eq("id", que.id)
          .single();

        if (error) {
          console.error("Error fetching question:", error);
          return;
        }

        const formattedData = {
          ...data,
          srNo: data.sr_no,
          hasIntegerAnswer: data.has_integer_answer,
          isMarkedForReview: data.is_marked_for_review,
          reviewInApp: data.review_in_app,
          isActive: data.is_active,
          topicId: data.topic_id,
          paragraphId: data.paragraph_id,
          paragraphContent: data.paragraphs?.content || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setQue(processQuestion(formattedData));
        setParagraphContent(formattedData.paragraphContent || "");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const updateQuestion = (value: any, field: string, index?: any) => {
    const newOb = { ...que };
    if (index !== undefined) {
      newOb[field][index] = value;
    } else {
      newOb[field] = value;
    }
    setQue(newOb);
    setIsPending(true);
  };

  const updateParagraph = async () => {
    if (!que.paragraphId || !paragraphContent) return;

    try {
      const { error } = await supabaseBrowserClient
        .from("paragraphs")
        .update({ content: paragraphContent })
        .eq("id", que.paragraphId);

      if (error) {
        console.error("Error updating paragraph:", error);
        message.error("Failed to update paragraph");
        return;
      }
      message.success("Paragraph updated successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to update paragraph");
    }
  };

  const updateQuestionDetails = async () => {
    try {
      const previouslyUpdated =
        JSON.parse(localStorage.getItem(`${topicId}-updated`) || "[]") || [];
      previouslyUpdated.push(que.srNo);
      localStorage.setItem(
        `${topicId}-updated`,
        JSON.stringify(previouslyUpdated)
      );
    } catch (error) {}

    if (que.id) {
      try {
        const queOb: any = {
          question: que.question,
          options: hasOptionsForType(que.type) ? que.options : null,
          answer: que.answer,
          solutions: que.solutions,
          sr_no: que.srNo,
          pyo: que.pyo,
          topic_id: que.topicId,
          type: que.type,
          verified_in_app: false,
        };

        if (que.isMarkedForReview) {
          queOb.is_marked_for_review = que.isMarkedForReview;
        }
        if (que.reviewInApp) {
          queOb.review_in_app = que.reviewInApp;
        }
        if (que.level) {
          queOb.level = Number(que.level || 0);
        } else {
          queOb.level = 0;
        }

        const { error } = await supabaseBrowserClient
          .from("questions")
          .update(queOb)
          .eq("id", que.id);

        if (error) {
          console.error("Error updating question:", error);
          message.error("Failed to update question");
          return;
        }

        // Also update paragraph if it was modified
        if (que.paragraphId && paragraphContent !== question.paragraphContent) {
          await updateParagraph();
        }

        message.success("Question updated successfully");
        reloadQuestion();
      } catch (err) {
        console.error(err);
        message.error("Failed to update question");
      }
    }

    if (handleUpdate) {
      handleUpdate(que);
    }
    setIsPending(false);
  };

  if (que === null) {
    return null;
  }

  const showOptions = hasOptionsForType(que.type);

  return (
    <Badge.Ribbon
      text={isUpdatedQuestion ? "Updated" : que.type || "N/A"}
      color={isUpdatedQuestion ? "orange" : getTypeColor(que.type)}
    >
      <Card
        title={
          <Flex align="center" gap={8}>
            <span>Q. {que.srNo}</span>
            {que.type && (
              <Tag color={getTypeColor(que.type)} style={{ marginLeft: 8 }}>
                {que.type}
              </Tag>
            )}
          </Flex>
        }
        style={{ width: "100%" }}
        extra={
          <>
            {!onlyPreview ? (
              <Flex gap={"0.5rem"} style={{ paddingRight: "5rem" }}>
                {que.id ? (
                  <>
                    {que.verified_in_app ? (
                      <Button color="green" variant="solid">
                        <CheckOutlined />
                      </Button>
                    ) : null}

                    <Button
                      color="blue"
                      variant="solid"
                      onClick={reloadQuestion}
                    >
                      <ReloadOutlined />
                    </Button>
                  </>
                ) : null}

                <Button
                  color={"green"}
                  variant="solid"
                >
                  L{que.level || 0}
                </Button>

                <Button
                  color={isPending ? "orange" : "green"}
                  variant="solid"
                  onClick={updateQuestionDetails}
                >
                  {isPending ? (
                    <ClockCircleOutlined />
                  ) : (
                    <CheckCircleOutlined />
                  )}
                  {isPending ? "Update" : "Updated"}
                </Button>
              </Flex>
            ) : null}
          </>
        }
      >
        <Flex gap={"1rem"}>
          {!onlyPreview ? (
            <Flex vertical gap="0.5rem" style={{ width: "50%" }}>
              {/* Paragraph Editor (for Comprehension types) */}
              {que.paragraphId && (
                <div style={{ marginBottom: "1rem", padding: "0.5rem", background: "#f5f5f5", borderRadius: 4 }}>
                  <Text strong style={{ display: "block", marginBottom: "0.5rem" }}>
                    Paragraph:
                  </Text>
                  <TextAreaWithImageTools
                    rows={4}
                    value={paragraphContent}
                    onChange={(value) => setParagraphContent(value)}
                    style={{ marginBottom: "0.5rem" }}
                    topicNumber={topicNumber}
                    questionNumber={que.srNo}
                  />
                </div>
              )}

              {/* Question Editor */}
              <TextAreaWithImageTools
                rows={3}
                value={que.question}
                onChange={(value) => updateQuestion(value, "question")}
                topicNumber={topicNumber}
                questionNumber={que.srNo}
              />

              {/* PYO Editor */}
              <TextAreaWithImageTools
                rows={1}
                style={{ marginBottom: "0.5rem" }}
                value={que.pyo}
                onChange={(value) => updateQuestion(value, "pyo")}
                placeholder="PYO (e.g., JEE Adv. 2017)"
                topicNumber={topicNumber}
                questionNumber={que.srNo}
              />

              {/* Type Editor */}
              <Input
                value={que.type}
                onChange={(e) => updateQuestion(e.target.value, "type")}
                placeholder="Question Type"
                style={{ marginBottom: "0.5rem" }}
              />

              {/* True/False Radio (for True/False type) */}
              {isTrueFalseType(que.type) ? (
                <Radio.Group
                  value={que.answer}
                  onChange={(e) => updateQuestion(e.target.value, "answer")}
                  style={{ marginBottom: "0.5rem" }}
                >
                  <Radio value="True">True</Radio>
                  <Radio value="False">False</Radio>
                </Radio.Group>
              ) : (
                <>
                  {/* Options Editor (only for types with options) */}
                  {showOptions && que.options && (
                    <>
                      {Object.keys(que.options).map(
                        (opKey: string, index: number) => (
                          <Flex
                            key={index}
                            style={{ marginBottom: "0.5rem" }}
                            gap={"0.25rem"}
                          >
                            {opKey})
                            <TextAreaWithImageTools
                              rows={2}
                              value={que.options[opKey]}
                              onChange={(value) =>
                                updateQuestion(value, "options", opKey)
                              }
                              topicNumber={topicNumber}
                              questionNumber={que.srNo}
                            />
                          </Flex>
                        )
                      )}
                    </>
                  )}

                  {/* Answer Editor */}
                  <TextAreaWithImageTools
                    rows={1}
                    style={{ marginBottom: "0.5rem", marginTop: "0.5rem" }}
                    value={que.answer}
                    onChange={(value) => updateQuestion(value, "answer")}
                    placeholder="Answer"
                    topicNumber={topicNumber}
                    questionNumber={que.srNo}
                  />
                </>
              )}
            </Flex>
          ) : null}

          {/* Preview Section */}
          <Flex vertical style={{ flex: 1 }}>
            {/* Paragraph Preview */}
            {paragraphContent && (
              <div style={{ marginBottom: "1rem", padding: "1rem", background: "#1f1f1f", borderRadius: 4, border: "1px solid #434343" }}>
                <Text strong style={{ display: "block", marginBottom: "0.5rem", color: "#fff" }}>
                  Passage:
                </Text>
                <div style={{ color: "#e6e6e6" }}>
                  <MathExpression exp={paragraphContent} />
                </div>
              </div>
            )}

            {/* Question Preview */}
            <MathExpression exp={que.question} />
            <Text strong>{que.pyo}</Text>

            {/* Options Preview (only for types with options) */}
            {showOptions && que.options && Object.keys(que.options).length > 0 ? (
              <>
                <Title level={5}>Options:</Title>
                {Object.keys(que.options).map(
                  (opKey: string, index: number) => (
                    <Flex
                      key={index}
                      style={{ marginBottom: "0.5rem" }}
                      gap={"0.25rem"}
                    >
                      {opKey})<MathExpression exp={que.options[opKey]} />
                    </Flex>
                  )
                )}
              </>
            ) : null}

            {/* Answer Preview */}
            <Title level={5}>Answer: {que.answer || "(No answer)"}</Title>
          </Flex>
        </Flex>
      </Card>
    </Badge.Ribbon>
  );
};
