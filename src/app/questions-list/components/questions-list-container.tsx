"use client";

import { supabaseBrowserClient } from "@utils/supabase/client";
import DropdownFilters from "../../../components/dropdown-filters/dropdown-filters";
import { Question } from "@app/questions/components/question/question";
import { Flex } from "antd";
import React, { use, useEffect, useState } from "react";
import { QuestionsListInfo } from "./questions-list-info";
import { FloatButton } from "antd";

export function QuestionsListContainer() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [questions, setQuestions] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchQuestions = async () => {
    if (!filters?.topic?.id) {
      return;
    }

    try {
      const { data, error } = await supabaseBrowserClient
        .from("questions")
        .select("*")
        .eq("topic_id", filters.topic.id)
        .order("sr_no");

      if (error) {
        console.error("Error fetching questions:", error);
        return;
      }

      const formattedData = data?.map((item) => ({
        ...item,
        srNo: item.sr_no,
        hasIntegerAnswer: item.has_integer_answer,
        isMarkedForReview: item.is_marked_for_review,
        reviewInApp: item.review_in_app,
        isActive: item.is_active,
        topicId: item.topic_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setQuestions(formattedData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterSubmit = (values: Record<string, any>) => {
    setFilters(values);
  };

  const handleUpdate = (question: any, index: number) => {
    const queList = [...questions];
    queList[index] = question;
    setQuestions(queList);
  };

  return (
    <>
      <Flex vertical gap={"1rem"}>
        <DropdownFilters handleFilterSubmit={handleFilterSubmit} />
        <QuestionsListInfo questions={questions} />
        <Flex vertical gap={12} style={{ width: "100%" }}>
          {questions?.map((question, index) => (
            <div key={index}>
              <Question
                question={question}
                handleUpdate={(que) => handleUpdate(que, index)}
              />
            </div>
          ))}
        </Flex>
      </Flex>
      <FloatButton.BackTop />
    </>
  );
}
