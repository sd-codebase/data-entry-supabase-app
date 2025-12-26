import { Flex } from "antd";
import React from "react";
import NeetChapterQuestionsContainer from "./components/neet-chapter-questions-container";

const NeetChapterQuestionsPage = () => {
  return (
    <Flex vertical>
      <NeetChapterQuestionsContainer />
    </Flex>
  );
};

export default NeetChapterQuestionsPage;
