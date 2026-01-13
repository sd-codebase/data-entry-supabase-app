/* eslint-disable */
import { Button, Col, Form, Row, Select } from "antd";
import React, { useEffect, useState } from "react";
import { supabaseBrowserClient } from "@/utils/supabase/client";

interface Course {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  courseId: string;
}

interface Chapter {
  id: string;
  name: string;
  subjectId: string;
  order: number;
}

interface Topic {
  id: string;
  name: string;
  chapterId: string;
  order: number;
  resources_directory: string;
}

interface Options {
  course: Course[];
  subject: Subject[];
  chapter: Chapter[];
  topic: Topic[];
}

export default function DropdownFilters({
  handleFilterSubmit,
  noTopic,
}: {
  noTopic?: boolean;
  handleFilterSubmit: (values: Record<string, any>) => void;
}) {
  const [form] = Form.useForm();
  const [options, setOptions] = useState<Options>({
    course: [],
    subject: [],
    chapter: [],
    topic: [],
  });
  const [filteredOptions, setFilteredOptions] = useState<Record<string, any>>({
    subject: [],
    chapter: [],
    topic: [],
  });

  const course = Form.useWatch("course", form);
  const subject = Form.useWatch("subject", form);
  const chapter = Form.useWatch("chapter", form);

  useEffect(() => {
    form.setFieldsValue({ subject: null, chapter: null, topic: null });
    setFilteredOptions({
      subject: options.subject
        ?.filter(({ courseId }) => courseId === course)
        .map(({ name: label, id: value }) => ({ label, value })),
      chapter: [],
      topic: [],
    });
  }, [course]);

  useEffect(() => {
    form.setFieldsValue({ chapter: null, topic: null });
    setFilteredOptions({
      ...filteredOptions,
      chapter: options.chapter
        ?.filter(({ subjectId }) => subjectId === subject)
        .sort((a: any, b: any) => a?.order - b?.order)
        .map(({ name: label, id: value, order: srNo }) => ({
          label: `${srNo}. ${label}`,
          value,
        })),
      topic: [],
    });
  }, [subject]);

  useEffect(() => {
    form.setFieldsValue({ topic: null });
    setFilteredOptions({
      ...filteredOptions,
      topic: options.topic
        ?.filter(({ chapterId }) => chapterId === chapter)
        .sort((a: any, b: any) => a?.order - b?.order)
        .map(({ name: label, id: value, order: srNo }) => ({
          label: `${srNo}. ${label}`,
          value,
        })),
    });
  }, [chapter]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const { data: courseData, error: courseError } =
        await supabaseBrowserClient
          .from("courses")
          .select("*")
          .eq("is_active", true);

      const { data: subjectData, error: subjectError } =
        await supabaseBrowserClient
          .from("subjects")
          .select("*")
          .eq("is_active", true);

      const { data: chapterData, error: chapterError } =
        await supabaseBrowserClient
          .from("chapters")
          .select("*")
          .eq("is_active", true);

      const { data: topicData, error: topicError } = await supabaseBrowserClient
        .from("topics")
        .select("*")
        .eq("is_active", true);

      if (courseError || subjectError || chapterError || topicError) {
        throw new Error("Error fetching data");
      }

      setOptions({
        course: courseData?.map(({ id, name }) => ({ id, name })) || [],
        subject:
          subjectData?.map(({ id, name, course_id: courseId }) => ({
            id,
            name,
            courseId,
          })) || [],
        chapter:
          chapterData?.map(
            ({ id, name, subject_id: subjectId, order_num: order }) => ({
              id,
              name,
              subjectId,
              order,
            })
          ) || [],
        topic:
          topicData?.map(
            ({
              id,
              name,
              chapter_id: chapterId,
              order_num: order,
              resources_directory,
            }) => ({
              id,
              name,
              chapterId,
              order,
              resources_directory,
            })
          ) || [],
      });

      form.setFieldsValue({
        course: null,
        subject: null,
        chapter: null,
        topic: null,
      });
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const onFinish = (values: Record<string, string>) => {
    const course: any = options.course.find(({ id }) => id === values.course);
    const subject: any = options.subject.find(
      ({ id }) => id === values.subject
    );
    const chapter: any = options.chapter.find(
      ({ id }) => id === values.chapter
    );
    const topic = options.topic.find(({ id }) => id === values.topic);
    const topics = options.topic.filter(
      ({ chapterId }) => chapterId === values.chapter
    );
    localStorage.setItem("filespath", topic?.resources_directory as string);
    handleFilterSubmit({ course, subject, chapter, topic, topics });
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Row gutter={[16, 8]} align="bottom">
        <Col xs={24} sm={12} md={8} lg={noTopic ? 6 : 5}>
          <Form.Item
            label="Course"
            name="course"
            rules={[{ required: true, message: "Please select course!" }]}
          >
            <Select
              options={options.course?.map(({ name: label, id: value }) => ({
                label,
                value,
              }))}
              style={{ width: "100%" }}
              placeholder="Select course"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8} lg={noTopic ? 6 : 5}>
          <Form.Item
            label="Subject"
            name="subject"
            rules={[{ required: true, message: "Please select subject!" }]}
          >
            <Select
              options={filteredOptions.subject}
              style={{ width: "100%" }}
              placeholder="Select subject"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8} lg={noTopic ? 6 : 5}>
          <Form.Item
            label="Chapter"
            name="chapter"
            rules={[{ required: true, message: "Please select chapter!" }]}
          >
            <Select
              options={filteredOptions.chapter}
              style={{ width: "100%" }}
              placeholder="Select chapter"
            />
          </Form.Item>
        </Col>
        {noTopic ? null : (
          <Col xs={24} sm={12} md={8} lg={5}>
            <Form.Item
              label="Topic"
              name="topic"
              rules={[{ required: true, message: "Please select topic!" }]}
            >
              <Select
                options={filteredOptions.topic}
                style={{ width: "100%" }}
                placeholder="Select topic"
              />
            </Form.Item>
          </Col>
        )}
        <Col xs={24} sm={12} md={8} lg={noTopic ? 6 : 4}>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Submit
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
