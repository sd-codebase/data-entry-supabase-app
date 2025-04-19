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
import MathExpression from "./math-expression";
import { useEffect, useState } from "react";
import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

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

  const updateQuestionDetails = () => {
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
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/questions/${que.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(que),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log({ data });
          message.success("Question updated successfully");
        })
        .catch((err) => {
          console.error(err);
        });
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
                  <Button
                    color={que.reviewInApp === true ? "green" : "default"}
                    variant="solid"
                    onClick={() => updateQuestion(true, "reviewInApp")}
                  >
                    View In App
                  </Button>
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
                  color={que.level === "1" ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion("1", "level")}
                >
                  L1
                </Button>
                <Button
                  color={que.level === "2" ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion("2", "level")}
                >
                  L2
                </Button>
                <Button
                  color={que.level === "3" ? "green" : "default"}
                  variant="solid"
                  onClick={() => updateQuestion("3", "level")}
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
