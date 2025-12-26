"use client";

import DropdownFilters from "@components/dropdown-filters/dropdown-filters";
import { AimOutlined, CheckCircleOutlined, CopyOutlined, ExclamationCircleOutlined, EyeInvisibleOutlined, EyeOutlined, FileTextOutlined, FormatPainterOutlined, LinkOutlined, PictureOutlined, PlusOutlined, SaveOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, message, Tag, Typography } from "antd";
import { useRef, useState } from "react";
import { supabaseBrowserClient } from "@utils/supabase/client";

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ParsedQuestion {
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  answer: string;
  sr_no: number;
  pyo: string;
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
}

export default function NeetChapterQuestionsContainer() {
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
    }[]
  >([]);
  const [jsonOutput, setJsonOutput] = useState<ParsedData | null>(null);
  const [parsingIssues, setParsingIssues] = useState<ParsingIssue[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(true);
  const outputTextAreaRef = useRef<any>(null);
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
      setFilters({});
      setTopics([]);
    }
  };

  const handleFormat = () => {
    if (!inputText.trim()) {
      message.warning("Please enter text to format");
      return;
    }

    let formatted = inputText;

    // Remove '\\' (double backslash)
    formatted = formatted.replace(/\\\\/g, "");

    // Remove '[0pt]'
    formatted = formatted.replace(/\[0pt\]/g, "");

    // Remove \begin{enumerate} and \end{enumerate} tags
    formatted = formatted.replace(/\\begin\{enumerate\}/g, "");
    formatted = formatted.replace(/\\end\{enumerate\}/g, "");

    // Remove lines containing "Topicwise NEET PYQ"
    formatted = formatted.replace(/^.*Topicwise NEET PYQ.*$\n?/gm, "");

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

    // MR* formatting rules - chain all patterns that should become [MR * ]
    // All patterns require a newline before them
    formatted = formatted
      // \n[MR ${ }^{\text {X}}$ ] -> \n[MR * ] (® , え, Н, etc.)
      .replace(/\n\[MR \$\{ \}\^\{\\text \{[^}]+\}\} ?\$\s*\]/g, "\n[MR * ]")
      // \n[MR ${ }^{\star}$ ] -> \n[MR * ]
      .replace(/\n\[MR \$\{ \}\^\{\\star\} ?\$\s*\]/g, "\n[MR * ]")
      // \n[ $\mathbf{M R}^{\star}$ ] -> \n[MR * ]
      .replace(/\n\[ ?\$\\mathbf\{M R\}\^\{\\star\}\$ ?\]/g, "\n[MR * ]")
      // \n[ $\mathbf{M R}^{\text {* }}$ ] -> \n[MR * ]
      .replace(/\n\[ ?\$\\mathbf\{M R\}\^\{\\text \{\* ?\}\} ?\$ ?\]/g, "\n[MR * ]")
      // \n[ $\mathbf{M R}^{*}$ ] -> \n[MR * ]
      .replace(/\n\[ ?\$\\mathbf\{M R\}\^\{\*\} ?\$ ?\]/g, "\n[MR * ]")
      // \n[ $\mathbf{M R}^{\boldsymbol{*}}$ ] -> \n[MR * ]
      .replace(/\n\[ ?\$\\mathbf\{M R\}\^\{\\boldsymbol\{\*\}\} ?\$ ?\]/g, "\n[MR * ]");

    // Replace newline + $(YEAR)$ or $(YEAR - text)$ with newline + (YEAR) or (YEAR - text)
    // e.g., \n$(1994,90)$ -> \n(1994,90), \n$(2004 - some text)$ -> \n(2004 - some text)
    formatted = formatted.replace(
      /\n\$\(([^)]+)\)\$/g,
      "\n($1)"
    );

    // Replace [MR * ] $(YEAR)$ or $(YEAR - text)$ with [MR * ] (YEAR) or (YEAR - text)
    // e.g., [MR * ] $(2013,2009)$ -> [MR * ] (2013,2009)
    formatted = formatted.replace(
      /\[MR \* \] \$\(([^)]+)\)\$/g,
      "[MR * ] ($1)"
    );

    // Add 'PYO - ' prefix before year patterns and MR patterns
    // \n(YEAR) -> \nPYO - (YEAR)
    formatted = formatted.replace(/\n\((\d)/g, "\nPYO - ($1");
    // \n[MR -> \nPYO - [MR
    formatted = formatted.replace(/\n\[MR /g, "\nPYO - [MR ");

    // Add 'OPT' prefix before option 'a.'
    // \na. -> \nOPT\na.
    formatted = formatted.replace(/\na\. /g, "\nOPT\na. ");

    // Handle \setcounter{enumi}{N} and \item replacements
    // \setcounter{enumi}{29} means next \item should be 30
    // Also remove leading spaces before \item and pad single digits with 0
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
          return `${numStr}.`;
        }
      }
    );

    // Add Q. prefix and extra newline before question numbers
    // Format: \n\nQ.\n01. (newline + newline + Q. + newline + number + dot + space)
    // Only match whole numbers (01-09, 1-9, 10+), not decimals like 0.5
    formatted = formatted.replace(/\n(0[1-9]|[1-9]\d*)\. /g, "\n\nQ.\n$1. ");

    // Extract chapter name and topics from \section*{} patterns with positions
    // First occurrence is chapter name, subsequent ones are topics (except "Answer Key")
    const sectionRegex = /(?:^|\n)\\section\*\{([^}]+)\}/gm;
    const sectionsWithPos: { name: string; position: number }[] = [];
    let match;
    while ((match = sectionRegex.exec(formatted)) !== null) {
      sectionsWithPos.push({ name: match[1].trim(), position: match.index });
    }

    // Extract all question numbers with their positions
    const questionRegex = /Q\.\n(\d+)\. /g;
    const questionsWithPos: { num: number; position: number }[] = [];
    while ((match = questionRegex.exec(formatted)) !== null) {
      questionsWithPos.push({ num: parseInt(match[1], 10), position: match.index });
    }

    if (sectionsWithPos.length > 0) {
      // First section is the chapter name
      setExtractedChapter(sectionsWithPos[0].name);

      // Get topic sections (excluding first/chapter and "Answer Key")
      const topicSectionsWithPos = sectionsWithPos.slice(1).filter(
        (section) => section.name.toLowerCase() !== "answer key"
      );
      setExtractedTopics(topicSectionsWithPos.map((s) => s.name));

      // Find Answer Key position to exclude questions after it
      const answerKeySection = sectionsWithPos.find(
        (s) => s.name.toLowerCase() === "answer key"
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

        if (topicQuestions.length === 0) {
          return {
            topic: topic.name,
            count: 0,
            range: "No questions",
            missing: [],
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
        };
      });

      setTopicQuestionStats(stats);
    } else {
      setExtractedChapter("");
      setExtractedTopics([]);
      setTopicQuestionStats([]);
    }

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

  const handleParseToJson = () => {
    if (!outputText.trim()) {
      message.warning("Please format text first");
      return;
    }

    // Check for unprocessed images - warn if \includegraphics or https URLs are present
    const hasIncludeGraphics = /\\includegraphics/.test(outputText);
    const hasHttps = /https:\/\//.test(outputText);
    if (hasIncludeGraphics || hasHttps) {
      const warnings: string[] = [];
      if (hasIncludeGraphics) warnings.push("\\includegraphics");
      if (hasHttps) warnings.push("https URLs");
      message.warning(`Unprocessed images found: ${warnings.join(" and ")}. Use img? or https? buttons to find and convert them.`);
    }

    // 1. Split content at Answer Key section
    const answerKeySplit = outputText.split(/\\section\*\{Answer Key\}/i);
    const mainContent = answerKeySplit[0];
    const answerKeyContent = answerKeySplit[1] || "";

    // 2. Parse answers from Answer Key: "1. (c)" -> { 1: "c" }
    const answers: Record<number, string> = {};
    const answerRegex = /(\d+)\.\s*\(([a-d])\)/g;
    let answerMatch;
    while ((answerMatch = answerRegex.exec(answerKeyContent)) !== null) {
      answers[parseInt(answerMatch[1], 10)] = answerMatch[2];
    }

    // 3. Find all sections with their positions
    const sectionRegex = /\\section\*\{([^}]+)\}/g;
    const sectionsWithPos: { name: string; position: number; endPosition: number }[] = [];
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(mainContent)) !== null) {
      sectionsWithPos.push({
        name: sectionMatch[1].trim(),
        position: sectionMatch.index,
        endPosition: sectionMatch.index + sectionMatch[0].length,
      });
    }

    if (sectionsWithPos.length === 0) {
      message.error("No sections found in the text");
      return;
    }

    // First section is chapter, rest are topics
    const chapterName = sectionsWithPos[0].name;
    const topicSections = sectionsWithPos.slice(1);

    // Track all parsing issues
    const allIssues: ParsingIssue[] = [];

    // 4. Parse each topic's questions
    const parsedTopics: ParsedTopic[] = topicSections.map((topic, index) => {
      const topicStart = topic.endPosition;
      const topicEnd =
        index < topicSections.length - 1
          ? topicSections[index + 1].position
          : mainContent.length;

      const topicContent = mainContent.slice(topicStart, topicEnd);

      // Split by question markers "Q.\n"
      const questionChunks = topicContent.split(/\n\nQ\.\n/).filter((chunk) => chunk.trim());

      const questions: ParsedQuestion[] = questionChunks.map((chunk) => {
        // Extract question number
        const numMatch = chunk.match(/^(\d+)\.\s*/);
        const questionNum = numMatch ? parseInt(numMatch[1], 10) : 0;

        // Remove the number prefix
        let content = numMatch ? chunk.slice(numMatch[0].length) : chunk;

        // Split at OPT to separate question text from options
        const optSplit = content.split(/\nOPT\n/);
        const beforeOpt = optSplit[0];
        const optionsText = optSplit[1] || "";

        // Extract PYO line and format it
        const pyoMatch = beforeOpt.match(/PYO - ([^\n]+)/);
        let pyo = pyoMatch ? pyoMatch[1].trim() : "";
        // Replace ] with - and remove [, (, )
        pyo = pyo.replace(/\]/g, "-").replace(/[\[\(\)]/g, "").trim();

        // Split beforeOpt at PYO line to get text before and after PYO
        const pyoSplit = beforeOpt.split(/\nPYO - [^\n]+/);
        let questionText = pyoSplit[0].trim();
        const textAfterPyo = pyoSplit[1]?.trim() || "";

        // Append text after PYO to question text if present
        if (textAfterPyo) {
          questionText = questionText + "\n" + textAfterPyo;
        }

        // Parse options
        const options = { a: "", b: "", c: "", d: "" };
        const optionMatches = optionsText.match(/([a-d])\.\s*([^]*?)(?=\n[b-d]\.|$)/g);
        if (optionMatches) {
          optionMatches.forEach((opt) => {
            const optMatch = opt.match(/^([a-d])\.\s*([^]*)/);
            if (optMatch) {
              const key = optMatch[1] as "a" | "b" | "c" | "d";
              options[key] = optMatch[2].trim();
            }
          });
        }

        // Check for issues
        const questionIssues: string[] = [];
        if (!questionText.trim()) {
          questionIssues.push("Question text missing");
        }
        if (!pyo) {
          questionIssues.push("PYO missing");
        }
        if (!optionsText.trim()) {
          questionIssues.push("No options present");
        } else {
          const missingOpts: string[] = [];
          if (!options.a.trim()) missingOpts.push("a");
          if (!options.b.trim()) missingOpts.push("b");
          if (!options.c.trim()) missingOpts.push("c");
          if (!options.d.trim()) missingOpts.push("d");
          if (missingOpts.length > 0) {
            questionIssues.push(`Option ${missingOpts.join(", ")} missing`);
          }
        }
        if (!answers[questionNum]) {
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

        return {
          question: questionText,
          options,
          answer: answers[questionNum] || "",
          sr_no: questionNum,
          pyo,
          topic_id: topicId,
        };
      }).filter((q) => q.sr_no > 0);

      return {
        name: topic.name,
        questions,
      };
    });

    const parsedData: ParsedData = {
      chapter: chapterName,
      topics: parsedTopics,
    };

    setJsonOutput(parsedData);
    setParsingIssues(allIssues);
    console.log("Parsed JSON:", parsedData);
    console.log("Parsing Issues:", allIssues);
    message.success(`Parsed ${parsedTopics.reduce((sum, t) => sum + t.questions.length, 0)} questions`);
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
    // Check if text matches figure block pattern
    // \begin{figure}[h]\begin{center}\captionsetup{...}\caption{text}<content>\end{center}\end{figure}
    const figureBlockMatch = text.match(
      /\\begin\{figure\}\[h\][\s\S]*?\\caption\{([^}]*)\}\s*([\s\S]*?)\s*\\end\{center\}[\s\S]*?\\end\{figure\}/
    );
    if (figureBlockMatch) {
      const caption = figureBlockMatch[1].trim();
      const content = figureBlockMatch[2].trim();

      // Extract image name from content
      // Check for includegraphics
      const includeMatch = content.match(/\\includegraphics\[[^\]]*\]\{([^}]+)\}/);
      if (includeMatch) {
        return { caption, imageName: includeMatch[1].trim() };
      }

      // Check for mathpix URL in \texttt{}
      const textttMatch = content.match(/\\texttt\{https:\/\/cdn\.mathpix\.com\/cropped\/([^?]+)\?[^}]*\}/);
      if (textttMatch) {
        return { caption, imageName: textttMatch[1].trim() };
      }

      // Check for bare mathpix URL
      const mathpixMatch = content.match(/https:\/\/cdn\.mathpix\.com\/cropped\/([^?\s]+)/);
      if (mathpixMatch) {
        return { caption, imageName: mathpixMatch[1].trim() };
      }

      // Check for already converted {{img_name_img}}
      const imgTagMatch = content.match(/\{\{img_([^_]+)_img\}\}/);
      if (imgTagMatch) {
        return { caption, imageName: imgTagMatch[1].trim() };
      }

      // Use content as-is if no pattern matched
      return { caption, imageName: content };
    }

    // Check if text matches \includegraphics[...]{<name>} pattern
    const includeGraphicsMatch = text.match(/\\includegraphics\[.*?\]\{([^}]+)\}/);
    if (includeGraphicsMatch) {
      return { caption: "", imageName: includeGraphicsMatch[1].trim() };
    }

    // Check if text matches https://cdn.mathpix.com/cropped/<name>?... pattern
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

    // Access the native textarea element through Ant Design's ref structure
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

    // Build result: caption {{img_name_img}} or just {{img_name_img}}
    const wrappedText = caption
      ? `${caption} {{img_${finalImageName}_img}}`
      : `{{img_${finalImageName}_img}}`;

    // Replace selected text with wrapped text
    const newText =
      outputText.substring(0, start) + wrappedText + outputText.substring(end);
    setOutputText(newText);

    // Restore scroll position
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

    // Build result: caption {{imgcell_name_imgcell}} or just {{imgcell_name_imgcell}}
    const wrappedText = caption
      ? `${caption} {{imgcell_${finalImageName}_imgcell}}`
      : `{{imgcell_${finalImageName}_imgcell}}`;

    // Replace selected text with wrapped text
    const newText =
      outputText.substring(0, start) + wrappedText + outputText.substring(end);
    setOutputText(newText);

    // Restore scroll position
    setTimeout(() => {
      textarea.scrollTop = scrollTop;
    }, 0);

    message.success("Image cell tag added");
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

      // Insert clipboard content at cursor position
      const newText =
        outputText.substring(0, cursorPos) + clipboardText + outputText.substring(cursorPos);
      setOutputText(newText);

      // Restore scroll and set cursor after pasted content
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

    // Replace selected text with [MR * ]
    const replacementText = "[MR * ]";
    const newText =
      outputText.substring(0, start) + replacementText + outputText.substring(end);
    setOutputText(newText);

    // Restore scroll position
    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = start + replacementText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("MR* replaced");
  };

  const handlePyoAction = () => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const scrollTop = textarea.scrollTop;

    // Find the start of the current line
    const textBeforeCursor = outputText.substring(0, cursorPos);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf("\n");
    const lineStart = lastNewlineIndex + 1;

    // Insert "PYO - " at the beginning of the current line
    const insertText = "PYO - ";
    const newText =
      outputText.substring(0, lineStart) + insertText + outputText.substring(lineStart);
    setOutputText(newText);

    // Set cursor position after the inserted text and restore scroll
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

    // Insert newline + "PYO - " at cursor position
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

    // Insert \nOPT\n at cursor position
    const insertText = "\nOPT\n";
    const newText =
      outputText.substring(0, cursorPos) + insertText + outputText.substring(cursorPos);
    setOutputText(newText);

    // Set cursor position after the inserted text and restore scroll
    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = scrollTop;
      const newCursorPos = cursorPos + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    message.success("OPT inserted");
  };

  const scrollToQuestion = (questionNum: number) => {
    const textareaComponent = outputTextAreaRef.current;
    if (!textareaComponent) return;

    const textarea = textareaComponent.resizableTextArea?.textArea || textareaComponent;
    if (!textarea) return;

    // Find the question pattern in the output text
    // Format is: Q.\n01. or Q.\n1. etc.
    const paddedNum = questionNum < 10 ? `0${questionNum}` : `${questionNum}`;
    const patterns = [
      `Q.\n${paddedNum}. `,
      `Q.\n${questionNum}. `,
    ];

    let position = -1;
    for (const pattern of patterns) {
      position = outputText.indexOf(pattern);
      if (position !== -1) break;
    }

    if (position === -1) {
      message.warning(`Question ${questionNum} not found in output`);
      return;
    }

    // Focus the textarea
    textarea.focus();

    // Set selection to highlight the question number
    const selectionEnd = position + patterns[0].length;
    textarea.setSelectionRange(position, selectionEnd);

    // Scroll to the position
    // Calculate approximate line number and scroll
    const textBeforePosition = outputText.substring(0, position);
    const lineNumber = textBeforePosition.split("\n").length;
    const lineHeight = 21; // Approximate line height in pixels
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

    // If not found from current position, wrap around to start
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

    // Update search position for next search
    setIncludeGraphicsSearchPos(position + 1);

    // Focus and select
    textarea.focus();
    const selectionEnd = position + searchPattern.length;
    textarea.setSelectionRange(position, selectionEnd);

    // Scroll to position
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

    // If not found from current position, wrap around to start
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

    // Update search position for next search
    setHttpsSearchPos(position + 1);

    // Focus and select
    textarea.focus();

    // Try to select the full URL (until whitespace or newline)
    const urlMatch = outputText.substring(position).match(/^https[^\s\n]*/);
    const selectionEnd = urlMatch ? position + urlMatch[0].length : position + searchPattern.length;
    textarea.setSelectionRange(position, selectionEnd);

    // Scroll to position
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

  const handleSaveQuestions = async () => {
    if (!jsonOutput) {
      message.warning("Please parse the text first");
      return;
    }

    // Check if any questions have missing topic_id
    const questionsWithoutTopic = jsonOutput.topics.flatMap((t) =>
      t.questions.filter((q) => !q.topic_id)
    );

    if (questionsWithoutTopic.length > 0) {
      message.error(
        `${questionsWithoutTopic.length} questions have no matching topic. Please select the correct chapter first.`
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
      const { error } = await supabaseBrowserClient.from("questions").insert(
        allQuestions.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          sr_no: q.sr_no,
          pyo: q.pyo,
          topic_id: q.topic_id,
        }))
      );

      if (error) {
        console.error(error);
        message.error(error.message || "Error saving questions");
        return;
      }

      message.success(`${allQuestions.length} questions saved successfully!`);
      // Clear the parsed data after saving
      setJsonOutput(null);
      setParsingIssues([]);
    } catch (error) {
      console.error(error);
      message.error("Error saving questions");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if extracted topic matches any selected chapter topic
  const isTopicMatched = (extractedTopic: string) => {
    return topics.some(
      (topic) => topic.name.toLowerCase() === extractedTopic.toLowerCase()
    );
  };

  // Check if extracted chapter matches selected chapter
  const isChapterMatched = () => {
    return (
      filters?.chapter?.name &&
      extractedChapter &&
      filters.chapter.name.toLowerCase() === extractedChapter.toLowerCase()
    );
  };

  const handleCreateTopic = async (topicName: string, order: number) => {
    if (!filters?.chapter?.id) {
      message.error("Please select a chapter first");
      return;
    }

    try {
      const { data, error } = await supabaseBrowserClient
        .from("topics")
        .insert({
          name: topicName,
          chapter_id: filters.chapter.id,
          order_num: order,
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

  return (
    <Flex vertical gap={16} style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2} style={{ margin: 0 }}>
          Neet Chapter Questions
        </Title>
        {filters?.chapter?.name && (
          <Text strong>Chapter: {filters.chapter.name}</Text>
        )}
      </div>

      <DropdownFilters handleFilterSubmit={handleFilterSubmit} noTopic />

      <Card title="Input" size="small">
        <TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={20}
          placeholder="Paste your text here..."
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
        extra={
          <Flex vertical gap={4}>
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
                onClick={handleMrAction}
                size="small"
                title="Replace selected text with [MR * ]"
              >
                MR*
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
                    <Flex key={index} align="center" gap={8}>
                      <Tag
                        color={isTopicMatched(stat.topic) ? "success" : "warning"}
                        icon={isTopicMatched(stat.topic) ? <CheckCircleOutlined /> : <WarningOutlined />}
                      >
                        {index + 1}. {stat.topic}
                      </Tag>
                      {!isTopicMatched(stat.topic) && filters?.chapter?.id && (
                        <Button
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => handleCreateTopic(stat.topic, topics.length + index + 1)}
                          title="Create this topic in database"
                        >
                          Create
                        </Button>
                      )}
                      <Text>
                        <Text strong>{stat.count}</Text> questions ({stat.range})
                      </Text>
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
            Save {jsonOutput.topics.reduce((sum, t) => sum + t.questions.length, 0)} Questions to Database
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
