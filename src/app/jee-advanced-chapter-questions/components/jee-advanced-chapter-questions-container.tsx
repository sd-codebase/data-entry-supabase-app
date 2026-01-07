"use client";

import DropdownFilters from "@components/dropdown-filters/dropdown-filters";
import {
  AimOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormatPainterOutlined,
  LinkOutlined,
  PictureOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Card, Dropdown, Flex, Input, message, Modal, Tag, Typography } from "antd";
import { useRef, useState } from "react";
import { supabaseBrowserClient } from "@utils/supabase/client";

const { TextArea } = Input;
const { Title, Text } = Typography;

// Question types supported in JEE Advanced (includes variations for matching)
const QUESTION_TYPES = [
  "Single Correct",
  "Multiple Correct",
  "True/False",
  "Match the Column",
  "Match Column",
  "Numerical Types/Integer Types",
  "Numerical/Integer Types",
  "Numerical/Integer Type",
  "Numerical Types",
  "Integer Types",
  "Fill in the Blanks",
  "Subjective",
  "Comprehension Based/Passage Based",
  "Comprehension/Passage Based",
  "Comprehension Based",
  "Passage Based",
  "Passage-I",
  "Passage-II",
  "Passage-III",
  "Passage-IV",
  "Passage-V",
  "Paragraph",
  "Assertion Reason/Statement Based",
  "Assertion Reason",
  "Statement Based",
];

// Normalize question type to canonical form
const normalizeQuestionType = (type: string): string => {
  const lowerType = type.toLowerCase();

  // Numerical types normalization
  if (lowerType.includes("numerical") || lowerType.includes("integer")) {
    return "Numerical Types/Integer Types";
  }

  // Comprehension/Passage types normalization (including Passage-I, Passage-II, etc.)
  if (
    lowerType.includes("comprehension") ||
    lowerType.includes("passage") ||
    lowerType.includes("paragraph")
  ) {
    return "Comprehension Based/Passage Based";
  }

  // Assertion/Statement types normalization
  if (lowerType.includes("assertion") || lowerType.includes("statement")) {
    return "Assertion Reason/Statement Based";
  }

  // Match column normalization
  if (lowerType.includes("match")) {
    return "Match the Column";
  }

  return type;
};

interface ParsedQuestion {
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  } | null;
  answer: string;
  sr_no: number;
  pyo: string;
  topic_id: string;
  type: string;
  paragraph_id?: string; // Temporary ID that maps to a passage
}

interface ParsedParagraph {
  temp_id: string;
  content: string;
  topic_id: string;
}

interface ParsedTopic {
  name: string;
  questions: ParsedQuestion[];
}

interface ParsingIssue {
  topic: string;
  questionNum: number;
  issues: string[];
}

interface ParsedData {
  chapter: string;
  topics: ParsedTopic[];
  paragraphs: ParsedParagraph[];
}

// Helper function to generate resources_directory
function generateResourcesDirectory(subjectName: string, chapterName: string): string {
  const normalizedSubject = subjectName.toLowerCase().trim();
  const normalizedChapter = chapterName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${normalizedSubject}/${normalizedChapter}`;
}

export default function JeeAdvancedChapterQuestionsContainer() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [topics, setTopics] = useState<Record<string, any>[]>([]);
  const [extractedChapter, setExtractedChapter] = useState<string>("");
  const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
  const [topicQuestionStats, setTopicQuestionStats] = useState<
    {
      topic: string;
      count: number;
      range: string;
      missing: number[];
      types: string[];
    }[]
  >([]);
  const [jsonOutput, setJsonOutput] = useState<ParsedData | null>(null);
  const [parsingIssues, setParsingIssues] = useState<ParsingIssue[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(true);
  const inputTextAreaRef = useRef<any>(null);
  const outputTextAreaRef = useRef<any>(null);
  const [inputSearchText, setInputSearchText] = useState("");
  const [inputSearchPos, setInputSearchPos] = useState(0);
  const [outputSearchText, setOutputSearchText] = useState("");
  const [outputSearchPos, setOutputSearchPos] = useState(0);
  const [includeGraphicsSearchPos, setIncludeGraphicsSearchPos] = useState(0);
  const [httpsSearchPos, setHttpsSearchPos] = useState(0);
  const [alignedSearchPos, setAlignedSearchPos] = useState(0);
  const [arraySearchPos, setArraySearchPos] = useState(0);
  const [tableSearchPos, setTableSearchPos] = useState(0);
  const [figureSearchPos, setFigureSearchPos] = useState(0);

  const handleFilterSubmit = (values: Record<string, any>) => {
    if (values?.topics?.length > 0) {
      setFilters(values);
      setTopics(values?.topics?.sort((a: any, b: any) => a.order_num - b.order_num));
    } else {
      setFilters(values);
      setTopics([]);
    }
  };

  const handleFormat = () => {
    if (!inputText.trim()) {
      message.warning("Please enter text to format");
      return;
    }

    let formatted = inputText;

    // Remove LaTeX document preamble (everything before \begin{document})
    const beginDocMatch = formatted.match(/\\begin\{document\}/);
    if (beginDocMatch) {
      formatted = formatted.substring(beginDocMatch.index! + beginDocMatch[0].length);
    }

    // Remove \end{document}
    formatted = formatted.replace(/\\end\{document\}/g, "");

    // Remove '[0pt]'
    formatted = formatted.replace(/\[0pt\]/g, "");

    // Remove \begin{enumerate} and \end{enumerate} tags
    formatted = formatted.replace(/\\begin\{enumerate\}/g, "");
    formatted = formatted.replace(/\\end\{enumerate\}/g, "");

    // Remove \begin{center} and \end{center} tags
    formatted = formatted.replace(/\\begin\{center\}/g, "");
    formatted = formatted.replace(/\\end\{center\}/g, "");

    // Remove performance metrics (C-XX.XX W-XX.XX UA-XX.XX PC-XX.XX)
    formatted = formatted.replace(/C-\d+\.?\d*\s+W-\d+\.?\d*\s+UA-\d+\.?\d*(?:\s+PC-\d+\.?\d*)?/g, "");

    // Helper to add .jpg extension if missing
    const addExtension = (name: string) => {
      const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
      return exts.some((ext) => name.toLowerCase().endsWith(ext)) ? name : name + ".jpg";
    };

    // Replace \includegraphics[...]{name} with {{img_name.jpg_img}}
    formatted = formatted.replace(
      /\\includegraphics\[[^\]]*\]\{([^}]+)\}/g,
      (_, name) => `{{img_${addExtension(name.trim())}_img}}`
    );

    // Replace \includegraphics{name} (without brackets) with {{img_name.jpg_img}}
    formatted = formatted.replace(
      /\\includegraphics\{([^}]+)\}/g,
      (_, name) => `{{img_${addExtension(name.trim())}_img}}`
    );

    // Replace https://cdn.mathpix.com/cropped/name?... with {{img_name.jpg_img}}
    formatted = formatted.replace(
      /\\texttt\{https:\/\/cdn\.mathpix\.com\/cropped\/([^?]+)\?[^}]*\}/g,
      (_, name) => `{{img_${addExtension(name.trim())}_img}}`
    );

    // Also handle bare https URLs (not wrapped in \texttt)
    formatted = formatted.replace(
      /https:\/\/cdn\.mathpix\.com\/cropped\/([^?\s]+)\?[^\s]*/g,
      (_, name) => `{{img_${addExtension(name.trim())}_img}}`
    );

    // Handle \begin{figure}...\end{figure} blocks with caption
    // Extract caption and image, format as: caption {{img_...}}
    formatted = formatted.replace(
      /\\begin\{figure\}[^\n]*\n[\s\S]*?\\caption(?:setup\{[^}]*\})?\{([^}]*)\}\s*\n?\s*(\{\{img_[^}]+_img\}\})[\s\S]*?\\end\{figure\}/g,
      (_, caption, img) => {
        const captionText = caption.replace(/labelformat=empty/g, "").trim();
        return captionText ? `${captionText} ${img}` : img;
      }
    );

    // Also handle figure blocks where image comes before caption
    formatted = formatted.replace(
      /\\begin\{figure\}[^\n]*\n[\s\S]*?(\{\{img_[^}]+_img\}\})[\s\S]*?\\caption(?:setup\{[^}]*\})?\{([^}]*)\}[\s\S]*?\\end\{figure\}/g,
      (_, img, caption) => {
        const captionText = caption.replace(/labelformat=empty/g, "").trim();
        return captionText ? `${captionText} ${img}` : img;
      }
    );

    // Remove any remaining \captionsetup{...}
    formatted = formatted.replace(/\\captionsetup\{[^}]*\}/g, "");

    // Remove '\\' (double backslash) - do this after image conversions
    formatted = formatted.replace(/\\\\/g, "");

    // Handle \setcounter{enumi}{N} and \item replacements
    // \setcounter{enumi}{29} means next \item should be 30
    let itemCounter = 0;

    formatted = formatted.replace(
      /\\setcounter\{enumi\}\{(\d+)\}|[ \t]*\\item/g,
      (match, counterValue) => {
        if (match.includes("\\setcounter")) {
          // Set counter to the value, next \item will be counterValue + 1
          itemCounter = parseInt(counterValue, 10);
          return ""; // Remove the \setcounter line
        } else {
          // It's an \item (possibly with leading spaces)
          itemCounter++;
          // Pad single digit numbers with leading zero (1 -> 01, 9 -> 09)
          const numStr = itemCounter < 10 ? `0${itemCounter}` : `${itemCounter}`;
          // Add empty line before each question
          return `\n\nQ.${numStr}. `;
        }
      }
    );

    // Also handle standalone question numbers like "57. Question text" (after answer key)
    formatted = formatted.replace(/\n(\d+)\.\s+(?=[A-Z])/g, (_, num) => {
      const numStr = parseInt(num, 10) < 10 ? `0${num}` : num;
      // Add empty line before each question
      return `\n\nQ.${numStr}. `;
    });

    // Handle Comprehension/Passage Based sections - add **Start Passage** and **End Passage**
    const passageSectionRegex = /\\section\*\{(Comprehension[^}]*|Passage[^}]*|Paragraph[^}]*)\}/gi;
    let passageMatch;
    const passageInsertions: { position: number; text: string }[] = [];

    while ((passageMatch = passageSectionRegex.exec(formatted)) !== null) {
      // Find the end of the section header
      const sectionEndPos = passageMatch.index + passageMatch[0].length;

      // Find the first question after this section
      const textAfterSection = formatted.slice(sectionEndPos);
      const firstQuestionMatch = textAfterSection.match(/\n\nQ\.\d+\./);

      if (firstQuestionMatch && firstQuestionMatch.index !== undefined) {
        // There's text between section header and first question - that's the passage
        const passageText = textAfterSection.slice(0, firstQuestionMatch.index).trim();
        if (passageText.length > 50) { // Only if there's substantial text
          // Add **Start Passage** with placeholder (X-Y) at the beginning
          passageInsertions.push({
            position: sectionEndPos,
            text: "\n\n**Start Passage** (X-Y)\n",
          });
          // Add **End Passage** before the first question
          passageInsertions.push({
            position: sectionEndPos + firstQuestionMatch.index,
            text: "\n**End Passage**",
          });
        }
      }
    }

    // Apply insertions in reverse order to maintain positions
    passageInsertions.sort((a, b) => b.position - a.position);
    for (const insertion of passageInsertions) {
      formatted = formatted.slice(0, insertion.position) + insertion.text + formatted.slice(insertion.position);
    }

    // Extract chapter name and topics from \section*{} patterns BEFORE removing them
    const sectionRegex = /(?:^|\n)\\section\*\{([^}]+)\}/gm;
    const sectionsWithPos: { name: string; position: number }[] = [];
    let match;
    while ((match = sectionRegex.exec(formatted)) !== null) {
      sectionsWithPos.push({ name: match[1].trim(), position: match.index });
    }

    // Extract all question numbers with their positions
    const questionRegex = /Q\.(\d+)\. /g;
    const questionsWithPos: { num: number; position: number }[] = [];
    while ((match = questionRegex.exec(formatted)) !== null) {
      questionsWithPos.push({ num: parseInt(match[1], 10), position: match.index });
    }

    if (sectionsWithPos.length > 0) {
      // First section is the chapter name
      setExtractedChapter(sectionsWithPos[0].name);

      // Filter out non-topic sections (JEE-Advanced, question types, Answer Key)
      const nonTopicNames = [
        "jee-advanced",
        "jee advanced",
        "answer key",
        "answer mey",
        ...QUESTION_TYPES.map((t) => t.toLowerCase()),
      ];

      const topicSectionsWithPos = sectionsWithPos.slice(1).filter(
        (section) => !nonTopicNames.some((nt) => section.name.toLowerCase().includes(nt.toLowerCase()))
      );
      setExtractedTopics(topicSectionsWithPos.map((s) => s.name));

      // Find Answer Key position to exclude questions after it
      const answerKeySection = sectionsWithPos.find(
        (s) => s.name.toLowerCase().includes("answer")
      );
      const answerKeyPos = answerKeySection?.position ?? Infinity;

      // Calculate question stats for each topic
      const stats = topicSectionsWithPos.map((topic, index) => {
        const topicStart = topic.position;
        const topicEnd =
          index < topicSectionsWithPos.length - 1
            ? topicSectionsWithPos[index + 1].position
            : answerKeyPos;

        // Get questions within this topic's range
        const topicQuestions = questionsWithPos
          .filter((q) => q.position > topicStart && q.position < topicEnd)
          .map((q) => q.num)
          .sort((a, b) => a - b);

        // Find question types in this topic
        const topicContent = formatted.substring(topicStart, topicEnd);
        const foundTypes: string[] = [];
        QUESTION_TYPES.forEach((qt) => {
          if (topicContent.toLowerCase().includes(qt.toLowerCase())) {
            foundTypes.push(qt);
          }
        });

        if (topicQuestions.length === 0) {
          return {
            topic: topic.name,
            count: 0,
            range: "No questions",
            missing: [],
            types: foundTypes,
          };
        }

        const minQ = topicQuestions[0];
        const maxQ = topicQuestions[topicQuestions.length - 1];

        // Find missing numbers in the range
        const missing: number[] = [];
        for (let i = minQ; i <= maxQ; i++) {
          if (!topicQuestions.includes(i)) {
            missing.push(i);
          }
        }

        return {
          topic: topic.name,
          count: topicQuestions.length,
          range: `${minQ}-${maxQ}`,
          missing,
          types: foundTypes,
        };
      });

      setTopicQuestionStats(stats);
    } else {
      setExtractedChapter("");
      setExtractedTopics([]);
      setTopicQuestionStats([]);
    }

    // Replace \section*{...} with readable placeholders
    // Build list of replacements based on section type
    const sectionReplacements: { pattern: RegExp; replacement: string }[] = [];

    sectionsWithPos.forEach((section, index) => {
      const sectionName = section.name;
      const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\n*\\\\section\\*\\{${escapedName}\\}\\n*`, 'g');

      if (index === 0) {
        // First section is chapter
        sectionReplacements.push({ pattern, replacement: `\n\n**Chapter - ${sectionName}**\n\n` });
      } else if (sectionName.toLowerCase().includes('jee-advanced') || sectionName.toLowerCase().includes('jee advanced')) {
        // Remove JEE-Advanced marker
        sectionReplacements.push({ pattern, replacement: '\n\n' });
      } else if (sectionName.toLowerCase().includes('answer')) {
        // Answer Key section
        sectionReplacements.push({ pattern, replacement: `\n\n**Answer Key**\n\n` });
      } else if (QUESTION_TYPES.some(qt => sectionName.toLowerCase().includes(qt.toLowerCase()))) {
        // Question type section - normalize the type name
        const normalizedType = normalizeQuestionType(sectionName);
        sectionReplacements.push({ pattern, replacement: `\n\n**Type - ${normalizedType}**\n\n` });
      } else {
        // Topic section
        sectionReplacements.push({ pattern, replacement: `\n\n**Topic - ${sectionName}**\n\n` });
      }
    });

    // Apply replacements
    for (const { pattern, replacement } of sectionReplacements) {
      formatted = formatted.replace(pattern, replacement);
    }

    // Clean up excessive newlines (more than 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    setOutputText(formatted);
    setIncludeGraphicsSearchPos(0);
    setHttpsSearchPos(0);
    setAlignedSearchPos(0);
    setArraySearchPos(0);
    setTableSearchPos(0);
    setFigureSearchPos(0);
    message.success("Text formatted successfully!");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      message.success("Copied to clipboard!");
    } catch {
      message.error("Failed to copy to clipboard");
    }
  };

  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setExtractedChapter("");
    setExtractedTopics([]);
    setTopicQuestionStats([]);
    setJsonOutput(null);
    setParsingIssues([]);
    setIncludeGraphicsSearchPos(0);
    setHttpsSearchPos(0);
    setAlignedSearchPos(0);
    setArraySearchPos(0);
    setTableSearchPos(0);
    setFigureSearchPos(0);
  };

  // Extract year from text (JEE Adv. YYYY, IIT-JEE YYYY, IIT JEE YYYY, etc.)
  // Also handles multiple years like (IIT-JEE 1993,1984)
  const extractYear = (text: string): string => {
    // Try different patterns - IIT[- ]JEE matches both "IIT-JEE" and "IIT JEE"
    // \d{4}(?:\s*,\s*\d{4})* matches one or more years separated by commas
    const patterns = [
      /\(JEE Adv\.?\s*\d{4}(?:\s*,\s*\d{4})*\)/i,
      /\[JEE Adv\.?\s*\d{4}(?:\s*,\s*\d{4})*\]/i,
      /\(IIT[- ]JEE\s*\d{4}(?:\s*,\s*\d{4})*\)/i,
      /\[IIT[- ]JEE\s*\d{4}(?:\s*,\s*\d{4})*\]/i,
      /\(JEE Advanced\s*\d{4}(?:\s*,\s*\d{4})*\)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].replace(/[\[\]]/g, "").replace(/[()]/g, "").trim();
      }
    }
    return "";
  };

  // Detect question type from content
  const detectQuestionType = (questionContent: string, sectionType: string): string => {
    // First check the section type
    for (const qt of QUESTION_TYPES) {
      if (sectionType.toLowerCase().includes(qt.toLowerCase())) {
        return qt;
      }
    }

    // Fall back to content analysis
    if (questionContent.includes("Match") && questionContent.includes("Column")) {
      return "Match the Column";
    }
    if (questionContent.includes("True") || questionContent.includes("False")) {
      return "True/False";
    }
    if (questionContent.includes("$\\_\\_") || questionContent.includes("____")) {
      return "Fill in the Blanks";
    }

    return "Single Correct";
  };

  const handleParseToJson = () => {
    if (!outputText.trim()) {
      message.warning("Please format text first");
      return;
    }

    // Check for unprocessed images
    const hasIncludeGraphics = /\\includegraphics/.test(outputText);
    const hasHttps = /https:\/\//.test(outputText);
    if (hasIncludeGraphics || hasHttps) {
      const warnings: string[] = [];
      if (hasIncludeGraphics) warnings.push("\\includegraphics");
      if (hasHttps) warnings.push("https URLs");
      message.warning(`Unprocessed images found: ${warnings.join(" and ")}. Use img? or https? buttons to find and convert them.`);
    }

    // 1. Split content at Answer Key section (new placeholder format)
    const answerKeySplit = outputText.split(/\*\*Answer Key\*\*/i);
    const mainContent = answerKeySplit[0];
    const answerKeyContent = answerKeySplit[1] || "";

    // 2. Parse answers from Answer Key - store RAW answers (will format based on type later)
    const rawAnswers: Record<number, string> = {};

    // Split answer key by Q. markers or enumerate items
    const answerLines = answerKeyContent.split(/\n/).filter((line) => line.trim());
    let answerNum = 0;

    for (const line of answerLines) {
      // Check for Q.XX. format
      const qMatch = line.match(/Q\.(\d+)\.\s*(.*)/);
      if (qMatch) {
        answerNum = parseInt(qMatch[1], 10);
        const answerPart = qMatch[2].trim();
        if (answerPart) {
          // Store raw answer - will parse based on question type later
          rawAnswers[answerNum] = answerPart;
        }
        continue;
      }

      // Check for simple number format: "1. (a)" or just "(a)" after Q marker
      const simpleMatch = line.match(/^\s*(\d+)?\s*[.)]?\s*(.+)/);
      if (simpleMatch) {
        if (simpleMatch[1]) {
          answerNum = parseInt(simpleMatch[1], 10);
        } else {
          answerNum++;
        }
        const answerPart = simpleMatch[2].trim();
        if (answerPart && !answerPart.startsWith("\\") && !answerPart.startsWith("*")) {
          // Store raw answer - will parse based on question type later
          rawAnswers[answerNum] = answerPart;
        }
      }
    }

    // Helper to format answer based on question type
    const formatAnswerForType = (rawAnswer: string, qType: string): string => {
      if (!rawAnswer) return "";

      const lowerType = qType.toLowerCase();
      const isMcq = lowerType.includes("single") || lowerType.includes("multiple");

      if (isMcq) {
        // For MCQ types, extract content from brackets
        return parseAnswerValue(rawAnswer);
      } else {
        // For other types, just trim outer brackets/parentheses
        let answer = rawAnswer.trim();
        // Remove \hspace{0pt} and similar
        answer = answer.replace(/\\hspace\{[^}]*\}/g, "").trim();
        // Remove outer parentheses or brackets if present
        if ((answer.startsWith("(") && answer.endsWith(")")) ||
            (answer.startsWith("[") && answer.endsWith("]"))) {
          answer = answer.slice(1, -1).trim();
        }
        // Also handle $(...)$ format
        if (answer.startsWith("$(") && answer.endsWith(")$")) {
          answer = answer.slice(2, -2).trim();
        }
        return answer;
      }
    };

    // 3. Extract chapter name from **Chapter - <name>** placeholder
    const chapterMatch = mainContent.match(/\*\*Chapter - ([^*]+)\*\*/);
    const chapterName = chapterMatch ? chapterMatch[1].trim() : "";

    // 4. Find all topic sections with their positions (new placeholder format)
    const topicRegex = /\*\*Topic - ([^*]+)\*\*/g;
    const topicSections: { name: string; position: number; endPosition: number }[] = [];
    let topicMatch;
    while ((topicMatch = topicRegex.exec(mainContent)) !== null) {
      topicSections.push({
        name: topicMatch[1].trim(),
        position: topicMatch.index,
        endPosition: topicMatch.index + topicMatch[0].length,
      });
    }

    if (topicSections.length === 0) {
      message.error("No topics found in the text. Make sure to format first.");
      return;
    }

    // Track all parsing issues
    const allIssues: ParsingIssue[] = [];

    // 4. Extract all passages with their positions, question ranges, and generate temp IDs
    // Format: **Start Passage** (37-39) or **Start Passage** (X-Y) for placeholder
    const passageRegex = /\*\*Start Passage\*\*\s*\((\d+|X)-(\d+|Y)\)\n([\s\S]*?)\n\*\*End Passage\*\*/g;
    const passagesWithPos: {
      tempId: string;
      content: string;
      startPos: number;
      endPos: number;
      startQuestion: number | null;
      endQuestion: number | null;
    }[] = [];
    let passageMatch;
    while ((passageMatch = passageRegex.exec(mainContent)) !== null) {
      const tempId = `temp_${Math.random().toString(36).substring(2, 11)}`;
      const startQ = passageMatch[1];
      const endQ = passageMatch[2];
      passagesWithPos.push({
        tempId,
        content: passageMatch[3].trim(),
        startPos: passageMatch.index,
        endPos: passageMatch.index + passageMatch[0].length,
        // Parse question range - null if placeholder X-Y
        startQuestion: startQ === 'X' ? null : parseInt(startQ, 10),
        endQuestion: endQ === 'Y' ? null : parseInt(endQ, 10),
      });
    }

    // 5. Parse each topic's questions
    const parsedTopics: ParsedTopic[] = topicSections.map((topic, topicIndex) => {
      const topicStart = topic.endPosition;
      const topicEnd =
        topicIndex < topicSections.length - 1
          ? topicSections[topicIndex + 1].position
          : mainContent.length;

      const topicContent = mainContent.slice(topicStart, topicEnd);

      // Find current question type sections within this topic (new placeholder format)
      let currentType = "Single Correct";
      const typePositions: { type: string; position: number }[] = [];

      // Match **Type - <name>** placeholders and normalize the type
      const typeRegex = /\*\*Type - ([^*]+)\*\*/g;
      let typeMatch;
      while ((typeMatch = typeRegex.exec(topicContent)) !== null) {
        const normalizedType = normalizeQuestionType(typeMatch[1].trim());
        typePositions.push({ type: normalizedType, position: typeMatch.index });
      }
      typePositions.sort((a, b) => a.position - b.position);

      // Split by question markers "Q.XX. "
      const questionRegex = /Q\.(\d+)\.\s+/g;
      const questionPositions: { num: number; position: number; endPosition: number }[] = [];
      let qMatch;
      while ((qMatch = questionRegex.exec(topicContent)) !== null) {
        questionPositions.push({
          num: parseInt(qMatch[1], 10),
          position: qMatch.index,
          endPosition: qMatch.index + qMatch[0].length,
        });
      }

      const questions: ParsedQuestion[] = questionPositions.map((qPos, qIndex) => {
        const questionNum = qPos.num;
        const qStart = qPos.endPosition;
        const qEnd = qIndex < questionPositions.length - 1
          ? questionPositions[qIndex + 1].position
          : topicContent.length;

        let content = topicContent.slice(qStart, qEnd).trim();

        // Remove any placeholder markers from question content
        content = content.replace(/\*\*Chapter - [^*]+\*\*/g, '').trim();
        content = content.replace(/\*\*Topic - [^*]+\*\*/g, '').trim();
        content = content.replace(/\*\*Type - [^*]+\*\*/g, '').trim();
        content = content.replace(/\*\*Answer Key\*\*/g, '').trim();

        // Remove entire passage blocks (including content) from question content
        content = content.replace(/\*\*Start Passage\*\*\s*\(\d+-\d+\)[\s\S]*?\*\*End Passage\*\*/g, '').trim();
        content = content.replace(/\*\*Start Passage\*\*\s*\(X-Y\)[\s\S]*?\*\*End Passage\*\*/g, '').trim();

        // Determine question type based on position relative to type sections
        let questionType = currentType;
        for (const tp of typePositions) {
          if (tp.position < qPos.position) {
            questionType = tp.type;
          }
        }

        // Find if this question belongs to a passage based on question number range
        let paragraphId: string | undefined;
        for (const passage of passagesWithPos) {
          // Check if question number falls within the passage's question range
          if (
            passage.startQuestion !== null &&
            passage.endQuestion !== null &&
            questionNum >= passage.startQuestion &&
            questionNum <= passage.endQuestion
          ) {
            paragraphId = passage.tempId;
            break; // Found the matching passage
          }
        }

        // If question belongs to a passage, set type to Comprehension Based/Passage Based
        if (paragraphId) {
          questionType = "Comprehension Based/Passage Based";
        }

        // Extract year
        const pyo = extractYear(content);
        if (pyo) {
          // Remove year from content - handles multiple years like (IIT-JEE 1993,1984)
          content = content.replace(/\(JEE Adv\.?\s*\d{4}(?:\s*,\s*\d{4})*\)/gi, "")
            .replace(/\[JEE Adv\.?\s*\d{4}(?:\s*,\s*\d{4})*\]/gi, "")
            .replace(/\(IIT[- ]JEE\s*\d{4}(?:\s*,\s*\d{4})*\)/gi, "")
            .replace(/\[IIT[- ]JEE\s*\d{4}(?:\s*,\s*\d{4})*\]/gi, "")
            .replace(/\(JEE Advanced\s*\d{4}(?:\s*,\s*\d{4})*\)/gi, "")
            .trim();
        }

        // Parse options for MCQ types (not for passage-based questions)
        let options: { a: string; b: string; c: string; d: string } | null = null;
        const isMcqType = !paragraphId && (
          questionType.toLowerCase().includes("correct") ||
          questionType.toLowerCase().includes("true/false")
        );

        if (isMcqType) {
          options = { a: "", b: "", c: "", d: "" };

          // Options always start from a new line - match (a), (b), (c), (d) at start of line
          const optionPositions: { key: string; position: number; markerLength: number }[] = [];
          const optionMarkerRegex = /(?:^|\n)\(([a-d])\)\s*/g;
          let optMarker;
          while ((optMarker = optionMarkerRegex.exec(content)) !== null) {
            optionPositions.push({
              key: optMarker[1],
              position: optMarker.index,
              markerLength: optMarker[0].length,
            });
          }

          // Extract option text between markers
          if (optionPositions.length > 0) {
            // Find where options start (first option marker)
            const optionsStartPos = optionPositions[0].position;

            for (let i = 0; i < optionPositions.length; i++) {
              const current = optionPositions[i];
              const nextPos = i < optionPositions.length - 1
                ? optionPositions[i + 1].position
                : content.length;

              // Extract text after the marker
              const optionText = content.slice(current.position + current.markerLength, nextPos).trim();

              const key = current.key as "a" | "b" | "c" | "d";
              options[key] = optionText;
            }

            // Remove options from question text (everything from first option marker)
            content = content.slice(0, optionsStartPos).trim();
          }
        }

        // Clean up question text
        let questionText = content.trim();

        // Check for issues
        const questionIssues: string[] = [];
        if (!questionText) {
          questionIssues.push("Question text missing");
        }
        if (!pyo) {
          questionIssues.push("Year missing");
        }
        if (isMcqType && options) {
          const missingOpts: string[] = [];
          if (!options.a?.trim()) missingOpts.push("a");
          if (!options.b?.trim()) missingOpts.push("b");
          if (!options.c?.trim()) missingOpts.push("c");
          if (!options.d?.trim()) missingOpts.push("d");
          if (missingOpts.length > 0 && missingOpts.length < 4) {
            questionIssues.push(`Option ${missingOpts.join(", ")} missing`);
          }
        }
        // Skip answer validation for Subjective and Fill in the Blanks type questions
        const isSubjective = questionType.toLowerCase().includes("subjective");
        const isFillInBlanks = questionType.toLowerCase().includes("fill");
        if (!isSubjective && !isFillInBlanks && !rawAnswers[questionNum]) {
          questionIssues.push("Answer missing");
        }

        if (questionIssues.length > 0 && questionNum > 0) {
          allIssues.push({
            topic: topic.name,
            questionNum,
            issues: questionIssues,
          });
        }

        // Find matching topic_id from selected topics
        const matchedTopic = topics.find(
          (t) => t.name.toLowerCase() === topic.name.toLowerCase()
        );
        const topicId = matchedTopic?.id || "";

        // Format answer based on question type
        const formattedAnswer = formatAnswerForType(rawAnswers[questionNum] || "", questionType);

        return {
          question: questionText,
          options,
          answer: formattedAnswer,
          sr_no: questionNum,
          pyo,
          topic_id: topicId,
          type: questionType,
          paragraph_id: paragraphId,
        };
      }).filter((q) => q.sr_no > 0);

      return {
        name: topic.name,
        questions,
      };
    });

    // Create parsed paragraphs with topic_id mapping
    const parsedParagraphs: ParsedParagraph[] = passagesWithPos.map((passage) => {
      // Find which topic this passage belongs to
      let passageTopicId = "";
      for (let i = 0; i < topicSections.length; i++) {
        const topicStart = topicSections[i].position;
        const topicEnd = i < topicSections.length - 1
          ? topicSections[i + 1].position
          : mainContent.length;
        if (passage.startPos >= topicStart && passage.startPos < topicEnd) {
          const matchedTopic = topics.find(
            (t) => t.name.toLowerCase() === topicSections[i].name.toLowerCase()
          );
          passageTopicId = matchedTopic?.id || "";
          break;
        }
      }
      return {
        temp_id: passage.tempId,
        content: passage.content,
        topic_id: passageTopicId,
      };
    });

    const parsedData: ParsedData = {
      chapter: chapterName,
      topics: parsedTopics,
      paragraphs: parsedParagraphs,
    };

    // Check for passages with placeholder ranges (X-Y)
    const passagesWithPlaceholder = passagesWithPos.filter(
      (p) => p.startQuestion === null || p.endQuestion === null
    );
    if (passagesWithPlaceholder.length > 0) {
      message.warning(
        `${passagesWithPlaceholder.length} passage(s) have placeholder (X-Y) range. Update to actual question numbers.`
      );
    }

    setJsonOutput(parsedData);
    setParsingIssues(allIssues);
    console.log("Parsed JSON:", parsedData);
    console.log("Parsing Issues:", allIssues);
    message.success(`Parsed ${parsedTopics.reduce((sum, t) => sum + t.questions.length, 0)} questions`);
  };

  // Helper to parse answer value from different formats
  const parseAnswerValue = (text: string): string => {
    // Remove \hspace{0pt} and similar
    text = text.replace(/\\hspace\{[^}]*\}/g, "").trim();

    // Handle $(a, b)$ format
    const dollarMatch = text.match(/\$\(([^)]+)\)\$/);
    if (dollarMatch) {
      return dollarMatch[1].trim();
    }

    // Handle (a), (a, b), (a,b,c) format
    const parenMatch = text.match(/\(([^)]+)\)/);
    if (parenMatch) {
      return parenMatch[1].trim();
    }

    // Handle [3], [2.66] format (numerical)
    const bracketMatch = text.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      return bracketMatch[1].trim();
    }

    // Handle A-p,q B-r,s format (match column)
    if (text.includes("-") && /[A-D]-/.test(text)) {
      return text.trim();
    }

    return text.trim();
  };

  const handleCopyJson = async () => {
    if (!jsonOutput) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
      message.success("JSON copied to clipboard!");
    } catch {
      message.error("Failed to copy JSON");
    }
  };

  const extractImageData = (text: string): { caption: string; imageName: string } => {
    // Check for \begin{figure}...\end{figure} block with caption and image
    if (text.includes("\\begin{figure}") && text.includes("\\end{figure}")) {
      // Extract caption from \caption{...} (ignore \captionsetup)
      const captionMatch = text.match(/\\caption(?!setup)\{([^}]*)\}/);
      const caption = captionMatch ? captionMatch[1].replace(/labelformat=empty/g, "").trim() : "";

      // Extract image name from \includegraphics
      const imgMatch = text.match(/\\includegraphics\[[^\]]*\]\{([^}]+)\}/) ||
                       text.match(/\\includegraphics\{([^}]+)\}/);
      if (imgMatch) {
        return { caption, imageName: imgMatch[1].trim() };
      }

      // Check for mathpix URL inside figure
      const mathpixMatch = text.match(/https:\/\/cdn\.mathpix\.com\/cropped\/([^?\s]+)/);
      if (mathpixMatch) {
        return { caption, imageName: mathpixMatch[1].trim() };
      }

      // Check for already converted {{img_..._img}} inside figure
      const imgTagMatch = text.match(/\{\{img_([^}]+)_img\}\}/);
      if (imgTagMatch) {
        // Return as-is without adding extension
        return { caption, imageName: imgTagMatch[1] };
      }
    }

    // Check for includegraphics with brackets
    const includeMatch = text.match(/\\includegraphics\[[^\]]*\]\{([^}]+)\}/);
    if (includeMatch) {
      return { caption: "", imageName: includeMatch[1].trim() };
    }

    // Check for includegraphics without brackets
    const includeNoBracketMatch = text.match(/\\includegraphics\{([^}]+)\}/);
    if (includeNoBracketMatch) {
      return { caption: "", imageName: includeNoBracketMatch[1].trim() };
    }

    // Check for mathpix URL
    const mathpixMatch = text.match(/https:\/\/cdn\.mathpix\.com\/cropped\/([^?]+)/);
    if (mathpixMatch) {
      return { caption: "", imageName: mathpixMatch[1].trim() };
    }

    return { caption: "", imageName: text.trim() };
  };

  const addImageExtension = (imageName: string): string => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const hasExtension = imageExtensions.some((ext) =>
      imageName.toLowerCase().endsWith(ext)
    );
    return hasExtension ? imageName : imageName + ".jpg";
  };

  const handleImgAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;

    if (start === end) {
      message.warning("Please select some text first");
      return;
    }

    const rawSelectedText = outputText.substring(start, end).trim();
    const { caption, imageName } = extractImageData(rawSelectedText);
    const finalImageName = addImageExtension(imageName);

    const wrappedText = caption
      ? `${caption} {{img_${finalImageName}_img}}`
      : `{{img_${finalImageName}_img}}`;

    const newText =
      outputText.substring(0, start) + wrappedText + outputText.substring(end);
    setOutputText(newText);

    setTimeout(() => {
      textarea.scrollTop = scrollTop;
    }, 0);

    message.success("Image tag added");
  };

  const handleImgCellAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;

    if (start === end) {
      message.warning("Please select some text first");
      return;
    }

    const rawSelectedText = outputText.substring(start, end).trim();
    const { caption, imageName } = extractImageData(rawSelectedText);
    const finalImageName = addImageExtension(imageName);

    const wrappedText = caption
      ? `${caption} {{imgcell_${finalImageName}_imgcell}}`
      : `{{imgcell_${finalImageName}_imgcell}}`;

    const newText =
      outputText.substring(0, start) + wrappedText + outputText.substring(end);
    setOutputText(newText);

    setTimeout(() => {
      textarea.scrollTop = scrollTop;
    }, 0);

    message.success("Image cell tag added");
  };

  const handleMrAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;

    if (start === end) {
      message.warning("Please select some text first");
      return;
    }

    const replacementText = "[MR * ]";
    const newText =
      outputText.substring(0, start) + replacementText + outputText.substring(end);
    setOutputText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = start + replacementText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("MR* replaced");
  };

  const handlePassageWrapAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;

    if (start === end) {
      message.warning("Please select some text first");
      return;
    }

    const selectedText = outputText.substring(start, end);
    // Add placeholder for question range - user needs to fill in the range like (37-39)
    const wrappedText = `**Start Passage** (X-Y)\n${selectedText.trim()}\n**End Passage**`;

    const newText =
      outputText.substring(0, start) + wrappedText + outputText.substring(end);
    setOutputText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      // Position cursor at X-Y placeholder for easy editing
      const placeholderPos = start + "**Start Passage** (".length;
      textarea.setSelectionRange(placeholderPos, placeholderPos + 3);
    }, 0);

    message.success("Passage markers added - update question range (X-Y)");
  };

  const handlePyoAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop;

    const textBeforeCursor = outputText.substring(0, cursorPos);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf("\n");
    const lineStart = lastNewlineIndex + 1;

    const insertText = "PYO - ";
    const newText =
      outputText.substring(0, lineStart) + insertText + outputText.substring(lineStart);
    setOutputText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = cursorPos + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("PYO inserted");
  };

  const handlePyoNewlineAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop;

    const insertText = "\nPYO - ";
    const newText =
      outputText.substring(0, cursorPos) + insertText + outputText.substring(cursorPos);
    setOutputText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = cursorPos + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("PYO newline inserted");
  };

  const handleOptAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop;

    const insertText = "\nOPT\n";
    const newText =
      outputText.substring(0, cursorPos) + insertText + outputText.substring(cursorPos);
    setOutputText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = cursorPos + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("OPT inserted");
  };

  const handleOptAbcdAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop;

    const insertText = "\nOPT\na. a\nb. b\nc. c\nd. d";
    const newText =
      outputText.substring(0, cursorPos) + insertText + outputText.substring(cursorPos);
    setOutputText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = cursorPos + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("OPT abcd inserted");
  };

  const handleInputSearch = (searchText?: string) => {
    const textareaComponent = inputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = searchText ?? inputSearchText;
    if (!searchPattern) {
      message.warning("Please enter search text");
      return;
    }

    // Update search text if provided
    if (searchText) {
      setInputSearchText(searchText);
    }

    let position = inputText.indexOf(searchPattern, inputSearchPos);

    // Wrap around if not found
    if (position === -1 && inputSearchPos > 0) {
      position = inputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning(`"${searchPattern}" not found`);
      setInputSearchPos(0);
      return;
    }

    setInputSearchPos(position + 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + searchPattern.length);

    const textBeforePosition = inputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success(`Found at line ${lineNumber}`);
  };

  const handleOutputSearch = (searchText?: string) => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = searchText ?? outputSearchText;
    if (!searchPattern) {
      message.warning("Please enter search text");
      return;
    }

    // Update search text if provided
    if (searchText) {
      setOutputSearchText(searchText);
    }

    let position = outputText.indexOf(searchPattern, outputSearchPos);

    // Wrap around if not found
    if (position === -1 && outputSearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning(`"${searchPattern}" not found`);
      setOutputSearchPos(0);
      return;
    }

    setOutputSearchPos(position + 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + searchPattern.length);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success(`Found at line ${lineNumber}`);
  };

  const handlePaste = async () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        message.warning("Clipboard is empty");
        return;
      }

      const cursorPos = textarea.selectionStart;
      const scrollTop = textarea.scrollTop;

      const newText =
        outputText.substring(0, cursorPos) + clipboardText + outputText.substring(cursorPos);
      setOutputText(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.scrollTop = scrollTop;
        const newCursorPos = cursorPos + clipboardText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);

      message.success("Pasted from clipboard");
    } catch {
      message.error("Failed to read clipboard");
    }
  };

  const scrollToQuestion = (questionNum: number) => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const paddedNum = questionNum < 10 ? `0${questionNum}` : `${questionNum}`;
    const patterns = [`Q.${paddedNum}. `, `Q.${questionNum}. `];

    let position = -1;
    for (const pattern of patterns) {
      position = outputText.indexOf(pattern);
      if (position !== -1) break;
    }

    if (position === -1) {
      message.warning(`Question ${questionNum} not found in output`);
      return;
    }

    textarea.focus();
    const selectionEnd = position + patterns[0].length;
    textarea.setSelectionRange(position, selectionEnd);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success(`Scrolled to question ${questionNum}`);
  };

  const handleFindIncludeGraphics = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = "\\includegraphics";
    let position = outputText.indexOf(searchPattern, includeGraphicsSearchPos);

    if (position === -1 && includeGraphicsSearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning("No \\includegraphics found");
      setIncludeGraphicsSearchPos(0);
      return;
    }

    setIncludeGraphicsSearchPos(position + 1);
    textarea.focus();
    const selectionEnd = position + searchPattern.length;
    textarea.setSelectionRange(position, selectionEnd);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success("Found \\includegraphics");
  };

  const handleFindHttps = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = "https";
    let position = outputText.indexOf(searchPattern, httpsSearchPos);

    if (position === -1 && httpsSearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning("No https found");
      setHttpsSearchPos(0);
      return;
    }

    setHttpsSearchPos(position + 1);
    textarea.focus();

    const urlMatch = outputText.substring(position).match(/^https[^\s\n]*/);
    const selectionEnd = urlMatch ? position + urlMatch[0].length : position + searchPattern.length;
    textarea.setSelectionRange(position, selectionEnd);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success("Found https URL");
  };

  const handleFindAligned = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = "aligned";
    let position = outputText.indexOf(searchPattern, alignedSearchPos);

    if (position === -1 && alignedSearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning("No aligned found");
      setAlignedSearchPos(0);
      return;
    }

    setAlignedSearchPos(position + 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + searchPattern.length);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success("Found aligned");
  };

  const handleFindArray = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = "array";
    let position = outputText.indexOf(searchPattern, arraySearchPos);

    if (position === -1 && arraySearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning("No array found");
      setArraySearchPos(0);
      return;
    }

    setArraySearchPos(position + 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + searchPattern.length);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success("Found array");
  };

  const handleFindTable = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = "begin{tabular}";
    let position = outputText.indexOf(searchPattern, tableSearchPos);

    if (position === -1 && tableSearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning("No tabular found");
      setTableSearchPos(0);
      return;
    }

    setTableSearchPos(position + 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + searchPattern.length);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success("Found tabular");
  };

  const handleFindFigure = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const searchPattern = "begin{figure}";
    let position = outputText.indexOf(searchPattern, figureSearchPos);

    if (position === -1 && figureSearchPos > 0) {
      position = outputText.indexOf(searchPattern, 0);
      if (position !== -1) {
        message.info("Wrapped to beginning");
      }
    }

    if (position === -1) {
      message.warning("No figure found");
      setFigureSearchPos(0);
      return;
    }

    setFigureSearchPos(position + 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + searchPattern.length);

    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21;
    textarea.scrollTop = Math.max(0, (lineNumber - 5) * lineHeight);

    message.success("Found figure");
  };

  const performSaveQuestions = async () => {
    if (!jsonOutput) return;

    // Check if any questions have missing topic_id
    const questionsWithoutTopic = jsonOutput.topics.flatMap((t) =>
      t.questions.filter((q) => !q.topic_id)
    );

    if (questionsWithoutTopic.length > 0) {
      message.error(
        `${questionsWithoutTopic.length} questions have no matching topic. Please create the topics first.`
      );
      return;
    }

    // Flatten all questions from all topics
    const allQuestions = jsonOutput.topics.flatMap((t) => t.questions);

    if (allQuestions.length === 0) {
      message.warning("No questions to save");
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Save paragraphs first and get their actual IDs
      const paragraphIdMap: Record<string, string> = {}; // temp_id -> actual_id

      if (jsonOutput.paragraphs && jsonOutput.paragraphs.length > 0) {
        // Check if any paragraphs have missing topic_id
        const paragraphsWithoutTopic = jsonOutput.paragraphs.filter((p) => !p.topic_id);
        if (paragraphsWithoutTopic.length > 0) {
          message.error(
            `${paragraphsWithoutTopic.length} paragraphs have no matching topic. Please create the topics first.`
          );
          setIsSaving(false);
          return;
        }

        const { data: paragraphData, error: paragraphError } = await supabaseBrowserClient
          .from("paragraphs")
          .insert(
            jsonOutput.paragraphs.map((p) => ({
              content: p.content,
              topic_id: p.topic_id,
            }))
          )
          .select("id");

        if (paragraphError) {
          console.error(paragraphError);
          message.error(paragraphError.message || "Error saving paragraphs");
          setIsSaving(false);
          return;
        }

        // Map temp IDs to actual IDs
        if (paragraphData) {
          jsonOutput.paragraphs.forEach((p, index) => {
            if (paragraphData[index]) {
              paragraphIdMap[p.temp_id] = paragraphData[index].id;
            }
          });
        }

        message.success(`${jsonOutput.paragraphs.length} paragraphs saved!`);
      }

      // Step 2: Save questions with actual paragraph_id
      const { error } = await supabaseBrowserClient.from("questions").insert(
        allQuestions.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          sr_no: q.sr_no,
          pyo: q.pyo,
          topic_id: q.topic_id,
          type: q.type,
          paragraph_id: q.paragraph_id ? paragraphIdMap[q.paragraph_id] || null : null,
        }))
      );

      if (error) {
        console.error(error);
        message.error(error.message || "Error saving questions");
        return;
      }

      message.success(`${allQuestions.length} questions saved successfully!`);
      setJsonOutput(null);
      setParsingIssues([]);
    } catch (error) {
      console.error(error);
      message.error("Error saving questions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestions = () => {
    if (!jsonOutput) {
      message.warning("Please parse the text first");
      return;
    }

    // Check for unprocessed content in output text
    const validationWarnings: string[] = [];

    if (outputText.includes("\\begin{tabular}") || outputText.includes("\\end{tabular}")) {
      validationWarnings.push("Unprocessed \\begin{tabular} or \\end{tabular} found");
    }

    if (outputText.includes("(X-Y)")) {
      validationWarnings.push("Placeholder (X-Y) passage range found");
    }

    if (outputText.includes("Assertion Reason")) {
      validationWarnings.push("\"Assertion Reason\" found in text");
    }

    if (/Match\s+.*\s*[Cc]olumn/i.test(outputText)) {
      validationWarnings.push("\"Match ... Column\" found in text");
    }

    if (validationWarnings.length > 0) {
      Modal.confirm({
        title: "Validation Warnings",
        icon: <WarningOutlined style={{ color: "#faad14" }} />,
        content: (
          <div>
            <p>The following issues were found:</p>
            <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
              {validationWarnings.map((warning, index) => (
                <li key={index} style={{ color: "#faad14" }}>{warning}</li>
              ))}
            </ul>
            <p>Do you want to proceed anyway?</p>
          </div>
        ),
        okText: "Proceed",
        cancelText: "Cancel",
        onOk: () => {
          performSaveQuestions();
        },
      });
      return;
    }

    performSaveQuestions();
  };

  // Check if extracted topic matches any selected chapter topic
  const isTopicMatched = (extractedTopic: string) => {
    return topics.some(
      (topic) => topic.name.toLowerCase() === extractedTopic.toLowerCase()
    );
  };

  // Helper to strip chapter number prefix (e.g., "5 SYSTEM OF..." -> "SYSTEM OF...")
  const stripChapterNumber = (name: string): string => {
    return name.replace(/^\d+\s+/, "").trim();
  };

  // Check if extracted chapter matches selected chapter (case-insensitive, ignoring chapter number)
  const isChapterMatched = () => {
    if (!filters?.chapter?.name || !extractedChapter) return false;

    const selectedName = stripChapterNumber(filters.chapter.name).toLowerCase();
    const extractedName = stripChapterNumber(extractedChapter).toLowerCase();

    return selectedName === extractedName;
  };

  const handleCreateTopic = async (topicName: string, order: number) => {
    if (!filters?.chapter?.id) {
      message.error("Please select a chapter first");
      return;
    }

    // Generate resources_directory
    const subjectName = filters?.subject?.name || "";
    const chapterName = filters?.chapter?.name || "";
    const resourcesDir = generateResourcesDirectory(subjectName, chapterName);

    try {
      const { data, error } = await supabaseBrowserClient
        .from("topics")
        .insert({
          name: topicName,
          chapter_id: filters.chapter.id,
          order_num: order,
          resources_directory: resourcesDir,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        message.error(error.message || "Error creating topic");
        return;
      }

      // Add the new topic to the local topics list
      setTopics((prev) => [...prev, data].sort((a, b) => a.order_num - b.order_num));
      message.success(`Topic "${topicName}" created successfully!`);
    } catch (error) {
      console.error(error);
      message.error("Error creating topic");
    }
  };

  const handleUpdateTopic = async (topicId: string, newName: string) => {
    try {
      const { data, error } = await supabaseBrowserClient
        .from("topics")
        .update({ name: newName })
        .eq("id", topicId)
        .select()
        .single();

      if (error) {
        console.error(error);
        message.error(error.message || "Error updating topic");
        return;
      }

      // Update the local topics list
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, name: newName } : t))
      );
      message.success(`Topic updated to "${newName}"`);
    } catch (error) {
      console.error(error);
      message.error("Error updating topic");
    }
  };

  // Get color for question type tag
  const getTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("single")) return "blue";
    if (lowerType.includes("multiple")) return "purple";
    if (lowerType.includes("numerical") || lowerType.includes("integer")) return "orange";
    if (lowerType.includes("match")) return "cyan";
    if (lowerType.includes("subjective")) return "green";
    if (lowerType.includes("fill")) return "magenta";
    if (lowerType.includes("true") || lowerType.includes("false")) return "gold";
    return "default";
  };

  return (
    <Flex vertical gap={16} style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2} style={{ margin: 0 }}>
          JEE Advanced Chapter Questions
        </Title>
        {filters?.chapter?.name && (
          <Text strong>Chapter: {filters.chapter.name}</Text>
        )}
      </div>

      <DropdownFilters handleFilterSubmit={handleFilterSubmit} noTopic />

      <Card
        title="Input"
        size="small"
        extra={
          <Flex gap={4} align="center">
            <Input
              placeholder="Search..."
              size="small"
              style={{ width: 150 }}
              value={inputSearchText}
              onChange={(e) => {
                setInputSearchText(e.target.value);
                setInputSearchPos(0);
              }}
              onPressEnter={() => handleInputSearch()}
            />
            <Button
              icon={<SearchOutlined />}
              size="small"
              onClick={() => handleInputSearch()}
              title="Find next match"
            >
              Find
            </Button>
          </Flex>
        }
      >
        <TextArea
          ref={inputTextAreaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={20}
          placeholder="Paste your JEE Advanced TEX content here..."
          style={{ fontFamily: "monospace" }}
        />
      </Card>

      <Flex gap={8}>
        <Button
          type="primary"
          icon={<FormatPainterOutlined />}
          onClick={handleFormat}
          disabled={!inputText.trim()}
        >
          Format
        </Button>
        <Button onClick={handleClear} disabled={!inputText && !outputText}>
          Clear
        </Button>
      </Flex>

      <Card
        title="Output"
        size="small"
        styles={{
          header: {
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: "var(--ant-color-bg-container)",
          },
        }}
        extra={
          <Flex vertical gap={4}>
            <Flex gap={4} justify="flex-end" align="center">
              <Input
                placeholder="Search..."
                size="small"
                style={{ width: 150 }}
                value={outputSearchText}
                onChange={(e) => {
                  setOutputSearchText(e.target.value);
                  setOutputSearchPos(0);
                }}
                onPressEnter={() => handleOutputSearch()}
              />
              <Button
                icon={<SearchOutlined />}
                size="small"
                onClick={() => handleOutputSearch()}
                title="Find next match"
              >
                Find
              </Button>
            </Flex>
            <Flex gap={4} justify="flex-end">
              <Button
                icon={<SearchOutlined />}
                onClick={handleFindIncludeGraphics}
                size="small"
                title="Find next \\includegraphics"
              >
                img?
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={handleFindHttps}
                size="small"
                title="Find next https URL"
              >
                https?
              </Button>
              <Button
                onClick={handleFindAligned}
                size="small"
                title="Find next aligned"
              >
                aligned?
              </Button>
              <Button
                onClick={handleFindArray}
                size="small"
                title="Find next array"
              >
                array?
              </Button>
              <Button
                onClick={handleFindTable}
                size="small"
                title="Find next tabular"
              >
                table?
              </Button>
              <Button
                onClick={handleFindFigure}
                size="small"
                title="Find next figure"
              >
                figure?
              </Button>
              <Button
                onClick={handlePyoAction}
                size="small"
                title="Insert PYO at start of current line"
              >
                PYO
              </Button>
              <Button
                onClick={handlePyoNewlineAction}
                size="small"
                title="Insert newline + PYO at cursor"
              >
                ↵PYO
              </Button>
              <Button
                onClick={handleOptAction}
                size="small"
                title="Insert OPT at cursor"
              >
                OPT
              </Button>
              <Button
                onClick={handleOptAbcdAction}
                size="small"
                title="Insert OPT with placeholder options"
              >
                OPT+
              </Button>
              <Button
                onClick={handleMrAction}
                size="small"
                title="Replace selected text with [MR * ]"
              >
                MR*
              </Button>
              <Button
                onClick={handlePassageWrapAction}
                size="small"
                title="Wrap selected text with Start/End Passage markers"
              >
                Passage
              </Button>
              <Button
                icon={<PictureOutlined />}
                onClick={handleImgAction}
                size="small"
                title="Wrap selected text as image"
              >
                img
              </Button>
              <Button
                icon={<PictureOutlined />}
                onClick={handleImgCellAction}
                size="small"
                title="Wrap selected text as image cell"
              >
                imgcell
              </Button>
            </Flex>
            <Flex gap={4} justify="flex-end">
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopy}
                disabled={!outputText}
                size="small"
              >
                Copy
              </Button>
              <Button
                onClick={handlePaste}
                size="small"
                title="Paste from clipboard at cursor"
              >
                Paste
              </Button>
            </Flex>
          </Flex>
        }
      >
        <TextArea
          ref={outputTextAreaRef}
          value={outputText}
          onChange={(e) => setOutputText(e.target.value)}
          rows={20}
          style={{ fontFamily: "monospace" }}
        />
      </Card>

      {outputText.trim() && (
        <Flex gap={8}>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleParseToJson}
          >
            Parse to JSON
          </Button>
          {jsonOutput && (
            <Button
              icon={showJsonPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowJsonPreview(!showJsonPreview)}
            >
              {showJsonPreview ? "Hide" : "Show"} JSON Preview
            </Button>
          )}
        </Flex>
      )}

      {jsonOutput && showJsonPreview && (
        <Card
          title={`Parsed JSON - ${jsonOutput.topics.reduce((sum, t) => sum + t.questions.length, 0)} questions`}
          size="small"
          extra={
            <Button icon={<CopyOutlined />} onClick={handleCopyJson} size="small">
              Copy JSON
            </Button>
          }
        >
          <pre
            style={{
              maxHeight: 400,
              overflow: "auto",
              fontSize: 12,
              padding: 12,
              borderRadius: 4,
              border: "1px solid var(--ant-color-border)",
              backgroundColor: "var(--ant-color-bg-container)",
              color: "var(--ant-color-text)",
            }}
          >
            {JSON.stringify(jsonOutput, null, 2)}
          </pre>
        </Card>
      )}

      {parsingIssues.length > 0 && (
        <Card
          title={
            <span>
              <ExclamationCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />
              Parsing Issues ({parsingIssues.length} questions with issues)
            </span>
          }
          size="small"
        >
          <Flex vertical gap={8} style={{ maxHeight: 300, overflow: "auto" }}>
            {parsingIssues.map((issue, index) => (
              <Flex key={index} align="center" gap={8}>
                <Button
                  type="text"
                  size="small"
                  icon={<AimOutlined />}
                  onClick={() => scrollToQuestion(issue.questionNum)}
                  title={`Go to Q${issue.questionNum}`}
                />
                <Text strong>
                  Q{issue.questionNum} ({issue.topic}):
                </Text>{" "}
                <Text type="danger">{issue.issues.join(", ")}</Text>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}

      {jsonOutput && parsingIssues.length === 0 && (
        <Card size="small">
          <Text type="success">
            <CheckCircleOutlined style={{ marginRight: 8 }} />
            All questions parsed successfully with no issues!
          </Text>
        </Card>
      )}

      {(extractedChapter || topicQuestionStats.length > 0) && (
        <Card title="Extracted from Text" size="small">
          <Flex vertical gap={12}>
            {extractedChapter && (
              <div>
                <Text strong>Chapter: </Text>
                <Tag
                  color={isChapterMatched() ? "success" : "warning"}
                  icon={isChapterMatched() ? <CheckCircleOutlined /> : <WarningOutlined />}
                >
                  {extractedChapter}
                </Tag>
                {filters?.chapter?.name && !isChapterMatched() && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    (Selected: {filters.chapter.name})
                  </Text>
                )}
              </div>
            )}
            {topicQuestionStats.length > 0 && (
              <div>
                <Text strong>
                  Topics ({topicQuestionStats.length}) - Total Questions:{" "}
                  {topicQuestionStats.reduce((sum, s) => sum + s.count, 0)}
                </Text>
                <Flex vertical gap={8} style={{ marginTop: 8 }}>
                  {topicQuestionStats.map((stat, index) => (
                    <Flex key={index} align="flex-start" gap={8} wrap="wrap">
                      <Tag
                        color={isTopicMatched(stat.topic) ? "success" : "warning"}
                        icon={isTopicMatched(stat.topic) ? <CheckCircleOutlined /> : <WarningOutlined />}
                      >
                        {index + 1}. {stat.topic}
                      </Tag>
                      {!isTopicMatched(stat.topic) && filters?.chapter?.id && (
                        <>
                          <Button
                            type="link"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => handleCreateTopic(stat.topic, topics.length + 1)}
                            title="Create this topic in database"
                          >
                            Create
                          </Button>
                          {topics.length > 0 && (
                            <Dropdown
                              menu={{
                                items: topics.map((t) => ({
                                  key: t.id,
                                  label: t.name,
                                  onClick: () => handleUpdateTopic(t.id, stat.topic),
                                })),
                              }}
                              trigger={["click"]}
                            >
                              <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                title="Update existing topic name"
                              >
                                Update
                              </Button>
                            </Dropdown>
                          )}
                        </>
                      )}
                      <Text>
                        <Text strong>{stat.count}</Text> questions ({stat.range})
                      </Text>
                      {stat.types.length > 0 && (
                        <Flex gap={4}>
                          {stat.types.slice(0, 3).map((type) => (
                            <Tag key={type} color={getTypeColor(type)} style={{ fontSize: 10 }}>
                              {type}
                            </Tag>
                          ))}
                          {stat.types.length > 3 && (
                            <Tag style={{ fontSize: 10 }}>+{stat.types.length - 3}</Tag>
                          )}
                        </Flex>
                      )}
                      {stat.missing.length > 0 && (
                        <Text type="danger">
                          Missing: {stat.missing.join(", ")}
                        </Text>
                      )}
                    </Flex>
                  ))}
                </Flex>
              </div>
            )}
          </Flex>
        </Card>
      )}

      {topics.length > 0 && (
        <Card title="Topics in Selected Chapter" size="small">
          <Flex wrap="wrap" gap={8}>
            {topics.map((topic, index) => (
              <Text key={topic.id} code>
                {index + 1}. {topic.name}
              </Text>
            ))}
          </Flex>
        </Card>
      )}

      {jsonOutput && (
        <Flex justify="center" style={{ marginTop: 16 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveQuestions}
            disabled={parsingIssues.length > 0}
            loading={isSaving}
            size="large"
          >
            Save {jsonOutput.paragraphs?.length ? `${jsonOutput.paragraphs.length} Paragraphs & ` : ""}
            {jsonOutput.topics.reduce((sum, t) => sum + t.questions.length, 0)} Questions to Database
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
