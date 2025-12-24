"use client";

import { supabaseBrowserClient } from "@utils/supabase/client";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  message,
  Result,
  Row,
  Space,
  Steps,
  Tree,
  Typography,
} from "antd";
import {
  CheckOutlined,
  ClearOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FolderAddOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import React, { useState } from "react";
import type { DataNode } from "antd/es/tree";

const { TextArea } = Input;
const { Title } = Typography;

// Input JSON structure interfaces
interface ChapterInput {
  name: string;
  topics: string[];
}

interface SubjectInput {
  name: string;
  chapters: ChapterInput[];
}

interface BulkTopicsInput {
  course: string;
  subjects: SubjectInput[];
}

// Parsed data with computed values
interface ParsedTopic {
  name: string;
  orderNum: number;
  resourcesDirectory: string;
}

interface ParsedChapter {
  name: string;
  orderNum: number;
  topics: ParsedTopic[];
}

interface ParsedSubject {
  name: string;
  chapters: ParsedChapter[];
}

interface ParsedData {
  course: string;
  subjects: ParsedSubject[];
}

// Progress tracking
type SaveStep =
  | "idle"
  | "course"
  | "subjects"
  | "chapters"
  | "topics"
  | "complete"
  | "error";

interface SaveProgress {
  step: SaveStep;
  error?: string;
}

// Sample JSON for user reference
const SAMPLE_JSON: BulkTopicsInput = {
  course: "JEE Main 2025",
  subjects: [
    {
      name: "Physics",
      chapters: [
        {
          name: "Kinematics",
          topics: [
            "Motion in One Dimension",
            "Motion in Two Dimensions",
            "Projectile Motion",
          ],
        },
        {
          name: "Newton's Laws",
          topics: ["First Law", "Second Law", "Third Law", "Applications"],
        },
      ],
    },
    {
      name: "Chemistry",
      chapters: [
        {
          name: "Atomic Structure",
          topics: ["Bohr Model", "Quantum Numbers", "Electronic Configuration"],
        },
      ],
    },
  ],
};

// Helper function to generate resources_directory
function generateResourcesDirectory(
  subjectName: string,
  chapterName: string
): string {
  const normalizedSubject = subjectName.toLowerCase().trim();
  const normalizedChapter = chapterName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens

  return `${normalizedSubject}/${normalizedChapter}`;
}

// Get step index for Steps component
function getStepIndex(step: SaveStep): number {
  switch (step) {
    case "course":
      return 0;
    case "subjects":
      return 1;
    case "chapters":
      return 2;
    case "topics":
      return 3;
    case "complete":
      return 4;
    default:
      return -1;
  }
}

export default function BulkTopicsContainer() {
  const [jsonInput, setJsonInput] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<SaveProgress>({
    step: "idle",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingDirs, setIsCreatingDirs] = useState(false);
  const [dirProgress, setDirProgress] = useState<{
    total: number;
    created: number;
  } | null>(null);

  // Validate the input structure
  const validateInput = (data: unknown): data is BulkTopicsInput => {
    if (!data || typeof data !== "object") {
      throw new Error("Input must be a JSON object");
    }

    const obj = data as Record<string, unknown>;

    if (
      !obj.course ||
      typeof obj.course !== "string" ||
      obj.course.trim() === ""
    ) {
      throw new Error(
        "'course' field is required and must be a non-empty string"
      );
    }

    if (!Array.isArray(obj.subjects) || obj.subjects.length === 0) {
      throw new Error(
        "'subjects' field is required and must be a non-empty array"
      );
    }

    for (let i = 0; i < obj.subjects.length; i++) {
      const subject = obj.subjects[i] as Record<string, unknown>;
      if (
        !subject.name ||
        typeof subject.name !== "string" ||
        subject.name.trim() === ""
      ) {
        throw new Error(
          `Subject at index ${i}: 'name' is required and must be a non-empty string`
        );
      }

      if (!Array.isArray(subject.chapters) || subject.chapters.length === 0) {
        throw new Error(
          `Subject "${subject.name}": 'chapters' is required and must be a non-empty array`
        );
      }

      for (let j = 0; j < subject.chapters.length; j++) {
        const chapter = subject.chapters[j] as Record<string, unknown>;
        if (
          !chapter.name ||
          typeof chapter.name !== "string" ||
          chapter.name.trim() === ""
        ) {
          throw new Error(
            `Subject "${subject.name}", Chapter at index ${j}: 'name' is required`
          );
        }

        if (!Array.isArray(chapter.topics) || chapter.topics.length === 0) {
          throw new Error(
            `Subject "${subject.name}", Chapter "${chapter.name}": 'topics' is required and must be a non-empty array`
          );
        }

        for (let k = 0; k < chapter.topics.length; k++) {
          const topic = chapter.topics[k];
          if (typeof topic !== "string" || topic.trim() === "") {
            throw new Error(
              `Subject "${subject.name}", Chapter "${chapter.name}": topic at index ${k} must be a non-empty string`
            );
          }
        }
      }
    }

    return true;
  };

  // Parse and validate JSON input
  const handleParse = () => {
    setParseError(null);
    setParsedData(null);

    if (!jsonInput.trim()) {
      setParseError("Please enter JSON data");
      return;
    }

    try {
      const data = JSON.parse(jsonInput);
      validateInput(data);

      // Transform to parsed data with computed values
      const parsed: ParsedData = {
        course: data.course,
        subjects: data.subjects.map((subject: SubjectInput) => ({
          name: subject.name,
          chapters: subject.chapters.map(
            (chapter: ChapterInput, chapterIndex: number) => ({
              name: chapter.name,
              orderNum: chapterIndex + 1,
              topics: chapter.topics.map(
                (topic: string, topicIndex: number) => ({
                  name: topic,
                  orderNum: topicIndex + 1,
                  resourcesDirectory: generateResourcesDirectory(
                    subject.name,
                    chapter.name
                  ),
                })
              ),
            })
          ),
        })),
      };

      setParsedData(parsed);
      message.success("JSON parsed successfully!");
    } catch (error) {
      if (error instanceof SyntaxError) {
        setParseError(`Invalid JSON syntax: ${error.message}`);
      } else if (error instanceof Error) {
        setParseError(error.message);
      } else {
        setParseError("Unknown error occurred");
      }
    }
  };

  // Load sample JSON
  const handleLoadSample = () => {
    setJsonInput(JSON.stringify(SAMPLE_JSON, null, 2));
    setParseError(null);
    setParsedData(null);
  };

  // Clear all data
  const handleClear = () => {
    setJsonInput("");
    setParsedData(null);
    setParseError(null);
    setSaveProgress({ step: "idle" });
  };

  // Create directories in Supabase Storage
  const handleCreateDirectories = async () => {
    setIsCreatingDirs(true);
    setDirProgress(null);

    try {
      // Step 1: Fetch all topics from database
      const { data: topics, error: fetchError } = await supabaseBrowserClient
        .from("topics")
        .select("resources_directory")
        .eq("is_active", true);

      if (fetchError) {
        throw new Error(`Failed to fetch topics: ${fetchError.message}`);
      }

      // Step 2: Extract unique resources_directory values
      const allDirs =
        topics
          ?.map((t) => t.resources_directory)
          .filter((dir): dir is string => !!dir) || [];
      const uniqueDirs = Array.from(new Set(allDirs));

      if (uniqueDirs.length === 0) {
        message.warning("No directories to create");
        return;
      }

      setDirProgress({ total: uniqueDirs.length, created: 0 });

      // Step 3: Create directories by uploading placeholder files
      const BUCKET_NAME = "neet-resources-store";
      let created = 0;

      const errors: string[] = [];

      for (const dir of uniqueDirs) {
        // Upload a .gitkeep placeholder to create directory
        const { error: uploadError } = await supabaseBrowserClient.storage
          .from(BUCKET_NAME)
          .upload(`${dir}/.gitkeep`, new Blob([""]), {
            upsert: true,
            contentType: "text/plain",
          });

        if (uploadError) {
          console.error(`Failed to create directory ${dir}:`, uploadError);
          errors.push(`${dir}: ${uploadError.message}`);
        } else {
          created++;
        }

        setDirProgress({ total: uniqueDirs.length, created });
      }

      if (errors.length > 0) {
        console.error("Directory creation errors:", errors);
        message.warning(
          `Created ${created}/${uniqueDirs.length} directories. Some failed - check console for details.`
        );
      } else {
        message.success(`Created ${created} directories successfully!`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      message.error(errorMessage);
    } finally {
      setIsCreatingDirs(false);
      setDirProgress(null);
    }
  };

  // Save data to database
  const handleSave = async () => {
    if (!parsedData) return;

    setIsSaving(true);
    setSaveProgress({ step: "course" });

    try {
      // Step 1: Insert Course
      const { data: courseData, error: courseError } =
        await supabaseBrowserClient
          .from("courses")
          .insert({ name: parsedData.course, is_active: true })
          .select("id")
          .single();

      if (courseError) {
        throw new Error(`Course insert failed: ${courseError.message}`);
      }

      const courseId = courseData.id;

      // Step 2: Insert Subjects
      setSaveProgress({ step: "subjects" });

      const subjectInsertData = parsedData.subjects.map((s) => ({
        name: s.name,
        course_id: courseId,
        is_active: true,
      }));

      const { data: subjectsData, error: subjectsError } =
        await supabaseBrowserClient
          .from("subjects")
          .insert(subjectInsertData)
          .select("id, name");

      if (subjectsError) {
        throw new Error(`Subjects insert failed: ${subjectsError.message}`);
      }

      // Create subject name to ID map
      const subjectIdMap = new Map<string, string>();
      subjectsData.forEach((s) => subjectIdMap.set(s.name, s.id));

      // Step 3: Insert Chapters
      setSaveProgress({ step: "chapters" });

      const chapterInsertData: Array<{
        name: string;
        order_num: number;
        subject_id: string;
        is_active: boolean;
      }> = [];

      parsedData.subjects.forEach((subject) => {
        const subjectId = subjectIdMap.get(subject.name)!;
        subject.chapters.forEach((chapter) => {
          chapterInsertData.push({
            name: chapter.name,
            order_num: chapter.orderNum,
            subject_id: subjectId,
            is_active: true,
          });
        });
      });

      const { data: chaptersData, error: chaptersError } =
        await supabaseBrowserClient
          .from("chapters")
          .insert(chapterInsertData)
          .select("id, name, subject_id");

      if (chaptersError) {
        throw new Error(`Chapters insert failed: ${chaptersError.message}`);
      }

      // Create chapter lookup map (key: subject_id:chapter_name)
      const chapterIdMap = new Map<string, string>();
      chaptersData.forEach((c) =>
        chapterIdMap.set(`${c.subject_id}:${c.name}`, c.id)
      );

      // Step 4: Insert Topics
      setSaveProgress({ step: "topics" });

      const topicInsertData: Array<{
        name: string;
        order_num: number;
        chapter_id: string;
        is_active: boolean;
        resources_directory: string;
      }> = [];

      parsedData.subjects.forEach((subject) => {
        const subjectId = subjectIdMap.get(subject.name)!;
        subject.chapters.forEach((chapter) => {
          const chapterId = chapterIdMap.get(`${subjectId}:${chapter.name}`)!;
          chapter.topics.forEach((topic) => {
            topicInsertData.push({
              name: topic.name,
              order_num: topic.orderNum,
              chapter_id: chapterId,
              is_active: true,
              resources_directory: topic.resourcesDirectory,
            });
          });
        });
      });

      const { error: topicsError } = await supabaseBrowserClient
        .from("topics")
        .insert(topicInsertData);

      if (topicsError) {
        throw new Error(`Topics insert failed: ${topicsError.message}`);
      }

      setSaveProgress({ step: "complete" });
      message.success("All data saved successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSaveProgress({ step: "error", error: errorMessage });
      message.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Build tree data for preview
  const buildTreeData = (): DataNode[] => {
    if (!parsedData) return [];

    return [
      {
        title: `Course: ${parsedData.course}`,
        key: "course",
        icon: <DatabaseOutlined />,
        children: parsedData.subjects.map((subject, sIdx) => ({
          title: `Subject: ${subject.name}`,
          key: `subject-${sIdx}`,
          children: subject.chapters.map((chapter, cIdx) => ({
            title: `${chapter.orderNum}. ${chapter.name}`,
            key: `chapter-${sIdx}-${cIdx}`,
            children: chapter.topics.map((topic, tIdx) => ({
              title: (
                <span>
                  {topic.orderNum}. {topic.name}{" "}
                  <span style={{ color: "#888", fontSize: "12px" }}>
                    [{topic.resourcesDirectory}]
                  </span>
                </span>
              ),
              key: `topic-${sIdx}-${cIdx}-${tIdx}`,
              isLeaf: true,
            })),
          })),
        })),
      },
    ];
  };

  // Count total items
  const getTotalCounts = () => {
    if (!parsedData) return { subjects: 0, chapters: 0, topics: 0 };

    let chapters = 0;
    let topics = 0;

    parsedData.subjects.forEach((subject) => {
      chapters += subject.chapters.length;
      subject.chapters.forEach((chapter) => {
        topics += chapter.topics.length;
      });
    });

    return {
      subjects: parsedData.subjects.length,
      chapters,
      topics,
    };
  };

  const counts = getTotalCounts();

  return (
    <>
      <div
        style={{
          padding: "16px 16px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Bulk Topics Import
        </Title>
        <Space>
          <Button
            onClick={handleCreateDirectories}
            loading={isCreatingDirs}
            icon={<FolderAddOutlined />}
          >
            Create Directories
          </Button>
          {dirProgress && (
            <span style={{ color: "#1890ff" }}>
              {dirProgress.created} / {dirProgress.total}
            </span>
          )}
        </Space>
      </div>

      <Row gutter={16} style={{ padding: 16 }}>
        {/* Left Panel: JSON Input */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                JSON Input
              </Space>
            }
            extra={
              <Space>
                <Button onClick={handleLoadSample} icon={<FileTextOutlined />}>
                  Load Sample
                </Button>
                <Button onClick={handleClear} icon={<ClearOutlined />}>
                  Clear
                </Button>
              </Space>
            }
          >
            <TextArea
              rows={20}
              placeholder={`Paste your JSON here...\n\nExpected format:\n{\n  "course": "Course Name",\n  "subjects": [\n    {\n      "name": "Subject Name",\n      "chapters": [\n        {\n          "name": "Chapter Name",\n          "topics": ["Topic 1", "Topic 2"]\n        }\n      ]\n    }\n  ]\n}`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              style={{ fontFamily: "monospace" }}
            />
            <Button
              type="primary"
              onClick={handleParse}
              style={{ marginTop: 16 }}
              icon={<CheckOutlined />}
              disabled={!jsonInput.trim()}
            >
              Parse & Validate
            </Button>
            {parseError && (
              <Alert
                type="error"
                message="Validation Error"
                description={parseError}
                style={{ marginTop: 8 }}
                showIcon
              />
            )}
          </Card>
        </Col>

        {/* Right Panel: Preview & Save */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                Preview & Save
              </Space>
            }
            extra={
              <Button
                type="primary"
                disabled={
                  !parsedData || isSaving || saveProgress.step === "complete"
                }
                onClick={handleSave}
                loading={isSaving}
                icon={<SaveOutlined />}
              >
                Save to Database
              </Button>
            }
          >
            {/* Progress Indicator */}
            {saveProgress.step !== "idle" && (
              <Steps
                current={getStepIndex(saveProgress.step)}
                status={saveProgress.step === "error" ? "error" : undefined}
                size="small"
                style={{ marginBottom: 16 }}
                items={[
                  { title: "Course" },
                  { title: "Subjects" },
                  { title: "Chapters" },
                  { title: "Topics" },
                  { title: "Done" },
                ]}
              />
            )}

            {/* Summary counts */}
            {parsedData && saveProgress.step === "idle" && (
              <Alert
                type="info"
                message="Ready to save"
                description={`${counts.subjects} subjects, ${counts.chapters} chapters, ${counts.topics} topics`}
                style={{ marginBottom: 16 }}
                showIcon
              />
            )}

            {/* Preview Tree */}
            {parsedData &&
              saveProgress.step !== "complete" &&
              saveProgress.step !== "error" && (
                <div style={{ maxHeight: 400, overflow: "auto" }}>
                  <Tree
                    treeData={buildTreeData()}
                    defaultExpandAll
                    showLine
                    showIcon
                  />
                </div>
              )}

            {/* Success Message */}
            {saveProgress.step === "complete" && (
              <Result
                status="success"
                title="Successfully saved all data!"
                subTitle={`Created: 1 course, ${counts.subjects} subjects, ${counts.chapters} chapters, ${counts.topics} topics`}
                extra={
                  <Button type="primary" onClick={handleClear}>
                    Import More Data
                  </Button>
                }
              />
            )}

            {/* Error Message */}
            {saveProgress.step === "error" && (
              <Result
                status="error"
                title="Save Failed"
                subTitle={saveProgress.error}
                extra={
                  <Space>
                    <Button type="primary" onClick={handleSave}>
                      Retry
                    </Button>
                    <Button onClick={handleClear}>Clear & Start Over</Button>
                  </Space>
                }
              />
            )}

            {/* Empty state */}
            {!parsedData && saveProgress.step === "idle" && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#999",
                }}
              >
                <DatabaseOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>
                  Enter JSON data and click <strong>Parse & Validate</strong> to
                  preview
                </p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
