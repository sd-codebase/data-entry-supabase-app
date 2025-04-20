import {
  Badge,
  Button,
  Card,
  Flex,
  Input,
  message,
  Space,
  Typography,
} from "antd";
import { supabaseBrowserClient } from "@utils/supabase/client";
import MathExpression from "./math-expression";
import { useEffect, useState } from "react";
import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

interface QuestionProps {
  question: any;
  handleUpdate?: (question: any) => void;
  isUpdatedQuestion?: boolean;
  topicId?: string;
  onlyPreview?: boolean;
}

const { Text, Title } = Typography;
const { TextArea } = Input;

export const Question = ({
  question,
  handleUpdate,
  isUpdatedQuestion,
  topicId,
  onlyPreview = false,
}: QuestionProps) => {
  const [que, setQue] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const optionNumbers: any = {
    1: "a",
    2: "b",
    3: "c",
    4: "d",
  };

  useEffect(() => {
    if (question) {
      setQue(question);
      console.log({ question });
    } else {
      setQue(null);
    }
  }, [question]);

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

        setQue(formattedData);
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
                    <Button
                      color={que.reviewInApp === true ? "green" : "default"}
                      variant="solid"
                      onClick={() => updateQuestion(true, "reviewInApp")}
                    >
                      View In App
                    </Button>
                  </>
                ) : null}

                <Button
                  color={que.isMarkedForReview === true ? "yellow" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion(true, "isMarkedForReview")}
                >
                  {que.isMarkedForReview === true ? "Marked " : "Mark "} for
                  review
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
              <TextArea
                rows={3}
                value={que.question}
                onChange={(e) => updateQuestion(e.target.value, "question")}
              />
              <TextArea
                rows={1}
                style={{ marginBottom: "0.5rem" }}
                value={que.pyo}
                onChange={(e) => updateQuestion(e.target.value, "pyo")}
              />

              {Object.keys(que.options || {}).map(
                (opKey: string, index: number) => (
                  <Flex
                    key={index}
                    style={{ marginBottom: "0.5rem" }}
                    gap={"0.25rem"}
                  >
                    {opKey})
                    <TextArea
                      rows={2}
                      value={que.options[opKey]}
                      onChange={(e) =>
                        updateQuestion(e.target.value, "options", opKey)
                      }
                    />
                  </Flex>
                )
              )}

              <TextArea
                rows={1}
                style={{ marginBottom: "0.5rem", marginTop: "0.5rem" }}
                value={que.answer}
                onChange={(e) => updateQuestion(e.target.value, "answer")}
              />

              {que?.solutions?.length
                ? que?.solutions.map((solution: string, index: number) => (
                    <TextArea
                      key={index}
                      rows={2}
                      value={solution}
                      onChange={(e) =>
                        updateQuestion(e.target.value, "solutions", index)
                      }
                    />
                  ))
                : null}
            </Flex>
          ) : null}
          <Flex vertical style={{ flex: 1 }}>
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
            <Title level={5}>Solution: </Title>
            {que.solutions?.map((solution: any, index: number) => (
              <div key={index}>
                {index === 1 ? (
                  <Title level={5}>Alternate Solution: </Title>
                ) : null}
                <MathExpression exp={solution} />
              </div>
            ))}
          </Flex>
        </Flex>
      </Card>
    </Badge.Ribbon>
  );
};
