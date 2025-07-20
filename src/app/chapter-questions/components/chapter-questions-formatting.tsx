"use client";
import QuestionComponent from "@app/questions/components/question-container";
import DropdownFilters from "@components/dropdown-filters/dropdown-filters";
import { Button, Card, Col, Flex, Input, message, Row, Typography } from "antd";
import { useState } from "react";
const { TextArea } = Input;
const { Text, Title } = Typography;

export const ChapterQuestionsFormatting = () => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [messageApi, contextHolder] = message.useMessage();
  const [questionText, setQuestionText] = useState("");
  const [topics, setTopics] = useState<Record<string, any>[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleFilterSubmit = (values: Record<string, any>) => {
    console.log(values);
    if (values?.topics?.length > 0) {
      console.log(values?.topics?.sort((a: any, b: any) => a.order - b.order));
      setFilters(values);
      setTopics(values?.topics);
    } else {
      setFilters({});
      setTopics([]);
    }
  };

  const handleFormatting = async () => {
    setQuestions([]);
    setAnswers([]);

    if (!filters?.chapter?.id) {
      messageApi.error("Please select a chapter");
      return;
    }
    if (!questionText) {
      messageApi.error("Please enter question data");
      return;
    }
    formatQuestions();
  };

  const formatQuestions = () => {
    // Implement the logic to format questions here
    //remove everything before first occurance of \section*{Topic 1
    const formattedQuestions = questionText
      .replace(/\[Given/g, "(Given")
      .replace(/^[\s\S]*?(?=\\section\*{Topic 1)/, "")
      .replace(
        /\\section\*\{- Key Index\}[\s\S]*?(?=\\section\*\{Detailed Explanations\})/,
        ""
      )
      .replace(/\\\\/g, "")
      .replace(/\\end{document}/g, "")
      .split(/\\section\*\{Detailed Explanations\}/);

    const questions = formattedQuestions[0]
      .replace(/\\section\*\{Topic \d+[^}]+\}/, "")
      .split(/\\section\*\{Topic \d+[^}]+\}/)
      .map((item) => item.replace(/^[ \t]*\\section\*.*\n?/gm, ""));
    const answers = formattedQuestions[1]
      .replace(/\\section\*\{Topic 1\}/, "")
      .split(/\\section\*\{Topic \d+\}/)
      .map((item) => item.replace(/^[ \t]*\\section\*.*\n?/gm, ""));
    console.log({ formattedQuestions, questions, answers, topics });
    if (questions.length !== answers.length) {
      setQuestions([]);
      setAnswers([]);
      messageApi.error("Questions and answers count mismatch");
      return;
    }
    if (
      topics.length !== answers.length ||
      topics.length !== questions.length
    ) {
      setQuestions([]);
      setAnswers([]);
      messageApi.error("Topics count mismatch");
      return;
    }
    setQuestions(questions);
    setAnswers(answers);
  };

  return (
    <>
      {contextHolder}
      <Flex vertical>
        <h1>Chapter Questions Formatting</h1>
        <DropdownFilters handleFilterSubmit={handleFilterSubmit} noTopic />
        <Row gutter={16}>
          <Col span={24}>
            <Flex style={{ paddingBottom: 16 }}>
              <Button
                onClick={handleFormatting}
                type="primary"
                disabled={!filters?.chapter?.name}
              >
                Format Now
              </Button>
              <Text style={{ paddingLeft: 16 }} strong>
                {filters?.chapter?.name
                  ? `Chapter: ${filters?.chapter?.name}`
                  : "Please select a chapter"}
              </Text>
            </Flex>
          </Col>
          <Col span={24}>
            <Card title="Questions">
              <TextArea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question data here..."
                style={{ height: 500, resize: "none" }}
              />
            </Card>
          </Col>
          <Col span={24}>
            <Flex vertical gap={"2rem"} style={{ paddingTop: "2rem" }}>
              {questions.length && answers.length
                ? questions.map((item: any, index: number) => (
                    <QuestionComponent
                      key={index}
                      questionsList={item as any}
                      answersList={answers[index]}
                      filterItem={{ ...filters, topic: topics[index] }}
                      noFilters
                    />
                  ))
                : null}
            </Flex>
          </Col>
        </Row>
      </Flex>
    </>
  );
};
