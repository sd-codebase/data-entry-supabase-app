import { Flex, Space, Typography } from "antd";
import React, { use, useEffect } from "react";

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
  }, [questions]);

  if (!questions?.length) {
    return null;
  }

  return (
    <Flex gap={"1.5rem"}>
      <Space direction="vertical">
        <h5>Total</h5>
        <Text>{totalQuestions}</Text>
      </Space>
      <Space direction="vertical">
        <h5>Questions</h5>
        <Text>
          Start: {staertAndEndNo.start} End: {staertAndEndNo.end}
        </Text>
      </Space>
      <Space direction="vertical">
        <h5>Questions With Options</h5>
        <Text>{optionsQuestions?.join(", ")}</Text>
      </Space>
      <Space direction="vertical">
        <h5>Repeat Questions</h5>
        <Text>{repeatQuestions?.join(", ")}</Text>
      </Space>
      <Space direction="vertical">
        <h5>Questions With Integer Answers</h5>
        <Text>{integerAnswersQuestions?.join(", ")}</Text>
      </Space>
      <Space direction="vertical">
        <h5>Missing Questions</h5>
        <Text>{missingQuestions?.join(", ")}</Text>
      </Space>
    </Flex>
  );
};
