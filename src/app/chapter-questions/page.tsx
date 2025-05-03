import { Flex } from "antd";
import React from "react";
import { ChapterQuestionsFormatting } from "./components/chapter-questions-formatting";

const FormattingPage = () => {
  return (
    <Flex vertical>
      <ChapterQuestionsFormatting />
    </Flex>
  );
};

export default FormattingPage;
