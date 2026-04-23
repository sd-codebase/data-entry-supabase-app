"use client";

import { supabaseBrowserClient } from "@utils/supabase/client";
import DropdownFilters from "../../../components/dropdown-filters/dropdown-filters";
import { Flex, FloatButton } from "antd";
import React, { useEffect, useState } from "react";
import { QuestionsListJeeAdvancedInfo } from "./questions-list-jee-advanced-info";
import { JeeAdvancedQuestion } from "./jee-advanced-question";

export function QuestionsListJeeAdvancedContainer() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [questions, setQuestions] = useState<Record<string, any>[]>([]);
  const [availableParagraphs, setAvailableParagraphs] = useState<{ id: string; content: string }[]>([]);

  useEffect(() => {
    fetchQuestions();
    fetchParagraphs();
  }, [filters]);

  const fetchParagraphs = async () => {
    if (!filters?.topic?.id) return;
    const { data, error } = await supabaseBrowserClient
      .from("paragraphs")
      .select("id, content")
      .eq("topic_id", filters.topic.id);
    if (error) {
      console.error("Error fetching paragraphs:", error);
      return;
    }
    setAvailableParagraphs(data || []);
  };

  const fetchQuestions = async () => {
    if (!filters?.topic?.id) {
      return;
    }

    try {
      // Fetch questions with paragraph data for comprehension types
      const { data, error } = await supabaseBrowserClient
        .from("questions")
        .select("*, paragraphs(id, content)")
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
        paragraphId: item.paragraph_id,
        paragraphContent: item.paragraphs?.content || null,
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
        <QuestionsListJeeAdvancedInfo questions={questions} />
        <Flex vertical gap={12} style={{ width: "100%" }}>
          {questions?.map((question, index) => (
            <div key={index}>
              <JeeAdvancedQuestion
                question={question}
                handleUpdate={(que) => handleUpdate(que, index)}
                topicId={filters?.topic?.id}
                topicNumber={filters?.topic?.order}
                availableParagraphs={availableParagraphs}
              />
            </div>
          ))}
        </Flex>
      </Flex>
      <FloatButton.BackTop />
    </>
  );
}
