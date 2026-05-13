import {
  Badge,
  Button,
  Card,
  Flex,
  Input,
  message,
  Modal,
  Space,
  Typography,
} from "antd";
import { supabaseBrowserClient } from "@utils/supabase/client";
import MathExpression from "./math-expression";
import { useEffect, useRef, useState } from "react";
import { TextAreaWithImageTools } from "@components/textarea-with-image-tools";
import {
  CameraOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { toPng } from "html-to-image";
import { SolutionExpression } from "./solution-expression";

interface QuestionProps {
  question: any;
  handleUpdate?: (question: any) => void;
  isUpdatedQuestion?: boolean;
  topicId?: string;
  topicNumber?: number;
  onlyPreview?: boolean;
  showSolutions?: boolean;
}

const { Text, Title } = Typography;
const { TextArea } = Input;

export const Question = ({
  question,
  handleUpdate,
  isUpdatedQuestion,
  topicId,
  topicNumber,
  onlyPreview = false,
  showSolutions = false,
}: QuestionProps) => {
  const [que, setQue] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const optionNumbers: any = {
    1: "a",
    2: "b",
    3: "c",
    4: "d",
  };

  useEffect(() => {
    if (question) {
      setQue(addOptionsIfMissing(question));
      console.log({ question });
    } else {
      setQue(null);
    }
  }, [question]);

  useEffect(() => {
    if (!isSolutionModalOpen) return;

    const handleFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text.startsWith("$$")) {
          setQue((prev: any) => {
            const newSolutions = [...(prev.solutions || [])];
            newSolutions[0] = text;
            return { ...prev, solutions: newSolutions };
          });
          setIsPending(true);
        }
      } catch {
        // clipboard read permission denied — silently ignore
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isSolutionModalOpen]);

  const reloadQuestion = async () => {
    if (que.id) {
      try {
        const { data, error } = await supabaseBrowserClient
          .from("questions")
          .select("*")
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
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setQue(addOptionsIfMissing(formattedData));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const addOptionsIfMissing = (data: any) => {
    if (!data.hasIntegerAnswer) {
      data.options = { a: "", b: "", c: "", d: "", ...data.options };
    }
    if (!data?.solutions?.length) {
      data.solutions = [""];
    }
    return data;
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

  const updateQuestionDetails = async (): Promise<boolean> => {
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
          options: que.options,
          has_integer_answer: que.hasIntegerAnswer,
          answer: que.answer,
          solutions: que.solutions,
          sr_no: que.srNo,
          pyo: que.pyo,
          topic_id: que.topicId,
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
          return false;
        }

        message.success("Question updated successfully");
        reloadQuestion();
      } catch (err) {
        console.error(err);
        message.error("Failed to update question");
        return false;
      }
    }

    if (handleUpdate) {
      handleUpdate(que);
    }
    setIsPending(false);
    return true;
  };

  const handleModalUpdate = async () => {
    setIsSolutionModalOpen(false);
    await updateQuestionDetails();
  };

  const capturePreview = async () => {
    if (!previewRef.current) return;
    try {
      // Run twice — first pass embeds fonts/SVGs, second pass captures correctly
      await toPng(previewRef.current);
      const dataUrl = await toPng(previewRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      message.success("Screenshot copied to clipboard!");
      setTimeout(() => setIsSolutionModalOpen(true), 2000);
    } catch (err) {
      message.error("Failed to capture screenshot");
    }
  };

  if (que === null) {
    return null;
  }

  return (
    <Badge.Ribbon
      text={isUpdatedQuestion ? "Updated" : "N/A"}
      color={isUpdatedQuestion ? "orange" : "blue"}
    >
      <Card
        title={`Q. ${que.srNo}`}
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
                    {/* <Button
                      color={que.reviewInApp === true ? "green" : "default"}
                      variant="solid"
                      onClick={() => updateQuestion(true, "reviewInApp")}
                    >
                      View In App
                    </Button> */}
                  </>
                ) : null}

                {/* <Button
                  color={que.isMarkedForReview === true ? "yellow" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion(true, "isMarkedForReview")}
                >
                  {que.isMarkedForReview === true ? "Marked " : "Mark "} for
                  review
                </Button>
                <Button
                  color={que.level === 0 ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion(0, "level")}
                >
                  No Level
                </Button>
                <Button
                  color={que.level === 1 ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion(1, "level")}
                >
                  L1
                </Button>
                <Button
                  color={que.level === 2 ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion(2, "level")}
                >
                  L2
                </Button>
                <Button
                  color={que.level === 3 ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion(3, "level")}
                >
                  L3
                </Button> */}

                <Button
                  color={"green"}
                  variant="solid"
                  // onClick={() => updateQuestion(3, "level")}
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
              <TextAreaWithImageTools
                rows={3}
                value={que.question}
                onChange={(value) => updateQuestion(value, "question")}
                topicNumber={topicNumber}
                questionNumber={que.srNo}
              />
              <TextAreaWithImageTools
                rows={1}
                style={{ marginBottom: "0.5rem" }}
                value={que.pyo}
                onChange={(value) => updateQuestion(value, "pyo")}
                topicNumber={topicNumber}
                questionNumber={que.srNo}
              />

              {Object.keys(que.options || {}).map(
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

              <TextAreaWithImageTools
                rows={1}
                style={{ marginBottom: "0.5rem", marginTop: "0.5rem" }}
                value={que.answer}
                onChange={(value) => updateQuestion(value, "answer")}
                topicNumber={topicNumber}
                questionNumber={que.srNo}
              />

              {showSolutions
                ? que?.solutions?.map((solution: string, index: number) => (
                    <TextAreaWithImageTools
                      key={index}
                      rows={2}
                      value={solution}
                      onChange={(value) =>
                        updateQuestion(value, "solutions", index)
                      }
                      topicNumber={topicNumber}
                      questionNumber={que.srNo}
                    />
                  ))
                : null}
            </Flex>
          ) : null}
          <Flex vertical style={{ flex: 1 }}>
            <Button
              icon={<CameraOutlined />}
              size="small"
              style={{ alignSelf: "flex-end", marginBottom: 8 }}
              onClick={capturePreview}
            >
              Copy Preview
            </Button>
            <div ref={previewRef} style={{ padding: '16px' }}>
              <MathExpression exp={que.question} />
              <Text strong>{que.pyo}</Text>
              {Object.keys(que.options || {})?.length > 0 ? (
                <>
                  <Title level={5}>Options:</Title>
                  {Object.keys(que.options)?.map(
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
              <Title level={5}>Answer: {que.answer}</Title>
            </div>
            {showSolutions && que.solutions?.length ? (
              <>
                <Title level={5}>Solution:</Title>
                {que.solutions.map((solution: string, index: number) => (
                  <div key={index}>
                    {index === 1 && solution?.trim() ? (
                      <Title level={5}>Alternate Solution:</Title>
                    ) : null}
                    <SolutionExpression solution={solution} />
                  </div>
                ))}
              </>
            ) : null}
          </Flex>
        </Flex>
      </Card>
      <Modal
        title={`Q. ${que.srNo} – Edit Solution`}
        open={isSolutionModalOpen}
        onCancel={() => setIsSolutionModalOpen(false)}
        maskClosable={false}
        keyboard={false}
        width="85vw"
        footer={[
          <Button key="close" onClick={() => setIsSolutionModalOpen(false)}>
            Close
          </Button>,
          <Button key="update" type="primary" onClick={handleModalUpdate}>
            Update
          </Button>,
        ]}
      >
        <Flex gap="1rem" style={{ minHeight: 300 }}>
          <Flex vertical gap="0.5rem" style={{ width: "50%" }}>
            {que?.solutions?.map((solution: string, index: number) => (
              <TextAreaWithImageTools
                key={index}
                rows={6}
                value={solution}
                onChange={(value) => updateQuestion(value, "solutions", index)}
                topicNumber={topicNumber}
                questionNumber={que.srNo}
              />
            ))}
          </Flex>
          <Flex vertical style={{ flex: 1, overflowY: "auto" }}>
            <Title level={5}>Preview:</Title>
            {que.solutions?.map((solution: string, index: number) => (
              <div key={index}>
                {index === 1 && solution?.trim() ? (
                  <Title level={5}>Alternate Solution:</Title>
                ) : null}
                <SolutionExpression solution={solution} />
              </div>
            ))}
          </Flex>
        </Flex>
      </Modal>
    </Badge.Ribbon>
  );
};
