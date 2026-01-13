import { supabaseBrowserClient } from "@utils/supabase/client";
import {
  Button,
  Col,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Row,
  Space,
  Typography,
} from "antd";
import TextArea from "antd/es/input/TextArea";
import React, { useEffect } from "react";

type QuestionsListInfoPropsType = {
  questions: Record<string, any>[];
};

const { Text } = Typography;
export const QuestionsListInfo = ({
  questions,
}: QuestionsListInfoPropsType) => {
  const totalQuestions = questions.length;
  const [integerAnswersQuestions, setIntegerAnswersQuestions] = React.useState<
    number[]
  >([]);
  const [optionsQuestions, setOptionsQuestions] = React.useState<number[]>([]);
  const [staertAndEndNo, setStartAndEndNo] = React.useState({
    start: 0,
    end: 0,
  });
  const [missingQuestions, setMissingQuestions] = React.useState<number[]>([]);
  const [repeatQuestions, setRepeatQuestions] = React.useState<number[]>([]);
  const [questionsWithLevels, setQuestionsWithLevels] =
    React.useState<string>("");
  const [showAnswers, setShowAnswers] = React.useState(false);
  const [showLevels, setShowLevels] = React.useState(false);
  const [initialLevels, setInitialLevels] = React.useState({
    l1: "",
    l2: "",
    l3: "",
  });

  const [form] = Form.useForm();

  useEffect(() => {
    if (!questionsWithLevels) {
      return;
    }

    const levels = questionsWithLevels.split(", \n");
    levels.forEach((level, index) => {
      form.setFieldValue(`l${index + 1}`, level.trim());
    });
  }, [questionsWithLevels]);

  useEffect(() => {
    if (questions.length === 0) {
      return;
    }

    const numbers: number[] = questions.map((question) => {
      return Number(question.srNo);
    });
    console.log({ questions: numbers });

    const start = Math.min(...numbers);
    const end = Math.max(...numbers);
    setStartAndEndNo({ start, end });

    const missing = [];
    for (let i = start; i <= end; i++) {
      if (!numbers.includes(i)) {
        missing.push(i);
      }
    }
    setMissingQuestions(missing);

    const repeat = numbers.filter((item, index) => {
      return numbers.indexOf(item) !== index;
    });
    setRepeatQuestions(repeat);

    const integerAnswer = questions
      .filter((item, index) => {
        return item.question.includes("{{INTEGER_ANSWER}}");
      })
      .map((item) => {
        return Number(item.srNo);
      });
    setIntegerAnswersQuestions(integerAnswer);

    const optionsQuestions = questions
      .filter((item, index) => {
        return Object.keys(item?.options || []).length > 0;
      })
      .map((item) => {
        return Number(item.srNo);
      });
    setOptionsQuestions(optionsQuestions);

    const questionsWithLevels = questions
      .filter((item) => {
        return (
          !item.question.includes("{{INTEGER_ANSWER}}") && item.pyo !== "NA"
        );
      })
      .map((item) => {
        return Number(item.srNo);
      });
    setQuestionsWithLevels(questionsWithLevels.join(", "));
  }, [questions]);

  const handleFinish = async (values: any) => {
    try {
      const { l1, l2, l3 } = values;
      const levelList: Record<string, any>[] = [];
      const queWithLevels: Record<string, any> = {};
      if (l1.split(",").length) {
        const l1Items = l1.split(",").map((qNo: string) => {
          const qId = questions.find((q) => q.srNo == qNo.trim())?.id;
          return qId;
        });
        if (l1Items.length) {
          levelList.push({ level: 1, items: l1Items });
        }
      }
      if (l2.split(",").length) {
        const l2Items = l2.split(",").map((qNo: string) => {
          const qId = questions.find((q) => q.srNo == qNo.trim())?.id;
          return qId;
        });
        if (l2Items.length) {
          levelList.push({ level: 2, items: l2Items });
        }
      }
      if (l3.split(",").length) {
        const l3Items = l3.split(",").map((qNo: string) => {
          const qId = questions.find((q) => q.srNo == qNo.trim())?.id;
          return qId;
        });
        if (l3Items.length) {
          levelList.push({ level: 3, items: l3Items });
        }
      }
      console.log({ levelList });

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
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <h5>Total</h5>
            <Text>{totalQuestions}</Text>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <h5>Questions</h5>
            <Text>
              Start: {staertAndEndNo.start} End: {staertAndEndNo.end}
            </Text>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <h5>Questions With Options</h5>
            <Text>{optionsQuestions?.join(", ")}</Text>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <h5>Repeat Questions</h5>
            <Text>{repeatQuestions?.join(", ")}</Text>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <h5>Questions With Integer Answers</h5>
            <Text>{integerAnswersQuestions?.join(", ")}</Text>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <h5>Missing Questions</h5>
            <Text>{missingQuestions?.join(", ")}</Text>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Space direction="vertical">
            <Button onClick={() => setShowAnswers(true)}>Answers</Button>
          </Space>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
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
        </Col>
      </Row>
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
                <Flex justify="end" key={index} style={{ minWidth: 100 }}>
                  <Text
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {question.srNo} ({question.answer})
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Modal>
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
                Questions with Levels are:{" "}
                <Input.TextArea
                  rows={4}
                  style={{ fontSize: 16, marginBottom: 16 }}
                  value={questionsWithLevels}
                  onChange={(e) => setQuestionsWithLevels(e.target.value)}
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
                      <Input />
                    </Form.Item>
                    <Form.Item label="L2" name="l2">
                      <Input />
                    </Form.Item>
                    <Form.Item label="L3" name="l3">
                      <Input />
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
