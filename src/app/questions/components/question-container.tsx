"use client";
import { RightOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Flex, message, Typography } from "antd";
import TextArea from "antd/lib/input/TextArea";
import React, { useEffect, useState } from "react";
import { Question } from "./question/question";
import DropdownFilters from "../../../components/dropdown-filters/dropdown-filters";
import { supabaseBrowserClient } from "@utils/supabase/client";
import { FloatButton } from "antd";
import { formatTableContent } from "@utils/formatter/table";

const { Title } = Typography;

const optionNumbers: any = {
  1: "a",
  2: "b",
  3: "c",
  4: "d",
};

const QuestionComponent = (props: any) => {
  const { questionsList, answersList, filterItem, noFilters } = props;
  const [questionText, setQuestionText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [questions, setQuestions] = useState<Record<string, any>[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [previouslyUpdated, setPreviouslyUpdated] = useState<any>([]);

  const [errors, setErrors] = useState<any>([]);

  const questionBlockStartFinder = /\n(\d+)/g;
  const questionStartFinder = /\n(\d+)/g;
  const pyoFinder = /\n\[/g;
  const optionsStartFinder = /\n\(a\) |\n\(a\)\n\s/g;
  const optionsFinder = /\n\([a-h]\)\s/g;

  useEffect(() => {
    console.log(filterItem);
    if (questionsList && answersList && filterItem) {
      setFilters(filterItem);
      const questions = transformEnumerators(questionsList);
      setQuestionText(questions?.replaceAll("[0pt]", ""));
      solutionTextChange(
        answersList?.replaceAll("[0pt]", "").replace(/\n(\d+ )/g, "\n $1")
      );
    }
  }, [questionsList, answersList, filterItem]);

  useEffect(() => {
    if (filters?.topic?.id) {
      const previouslyUpdated = JSON.parse(
        localStorage.getItem(`${filters?.topic?.id}-updated`) || "[]"
      );
      if (previouslyUpdated.length) {
        setPreviouslyUpdated(previouslyUpdated);
      }
      console.log({ previouslyUpdated });
    } else {
      setPreviouslyUpdated([]);
    }
  }, [filters?.topic?.id]);

  const addErrors = (error: string) => {
    setErrors((prevErrors: any) => [...prevErrors, error]);
    console.log({ errors });
  };

  const transformAndMapQuestions = () => {
    setErrors([]);
    if (!filters?.topic?.id) {
      message.error("Selecte a topic to save questions", 5);
      return;
    }
    const questions = transformQuestionText();
    const answers = transformSolutionText();
    if (Object.keys(questions).length !== Object.keys(answers).length) {
      message.error("Questions and Answers count do not match", 5);
      addErrors(
        `Questions and Answers count do not match: Questions: ${Object.keys(
          questions
        ).join(",")}, Answers: ${Object.keys(answers).join(",")}`
      );
    }
    const questionsList = Object.keys(questions).map((questionNumber) => {
      if (!answers[questionNumber]) {
        message.error(`Answer for Q. ${questionNumber} not found`, 5);
        addErrors(`Answer for Q. ${questionNumber} not found`);
      }
      return {
        srNo: Number(questionNumber),
        hasIntegerAnswer: questions[questionNumber].hasIntegerAnswer,
        question: questions[questionNumber].question,
        pyo: questions[questionNumber].pyo?.replace(/[\[\]()]/g, ""),
        options: questions[questionNumber].options,
        answer: answers[questionNumber]?.answer?.replace(/[\[\]()]/g, ""),
        solutions: answers[questionNumber]?.solutions,
        topicId: filters.topic.id,
      };
    });
    console.log(questionsList);
    setQuestions(questionsList.sort((a, b) => a.srNo - b.srNo));
  };

  function transformAllOptSections(input: string) {
    return input.replace(
      /\\begin{opt}([\s\S]+?)\\end{opt}/g,
      (match, content) => {
        const lines = content.trim().split("\n");
        const keys = lines[0].split(" & ").map((key: any) => key.trim());
        const outputLines = [];

        for (let i = 1; i < lines.length; i++) {
          const rowMatch = lines[i].match(/^\((\w)\) (.+)$/);
          if (rowMatch) {
            const label = rowMatch[1];
            const values = rowMatch[2]
              .split(" & ")
              .map((value: any) => value.trim());
            const mappedValues = keys
              .map((key: any, index: any) => `${key}-${values[index]}`)
              .join(", ");
            outputLines.push(`(${label}) ${mappedValues}`);
          }
        }
        return outputLines.join("\n");
      }
    );
  }

  function transformSections(input: string) {
    return (
      input
        .replace(
          /\\begin{aligned}([\s\S]+?)\\end{aligned}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{aligned}${updatedContent}\\end{aligned}`.replace(
              "\\begin{aligned} \\\\",
              "\\begin{aligned}"
            );
          }
        )
        .replace(
          /\\begin{align\*}([\s\S]+?)\\end{align\*}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{align*}${updatedContent}\\end{align*}`.replace(
              "\\begin{align*} \\\\",
              "\\begin{align*}"
            );
          }
        )
        .replace(/\\begin{array}([\s\S]+?)\\end{array}/g, (match, content) => {
          const updatedContent = content.replace(/\n/g, " \\\\\n");
          return `\\begin{array}${updatedContent}\\end{array}`.replace(
            "\\begin{array} \\\\",
            "\\begin{array}"
          );
        })
        .replace(
          /\\begin{array\*}([\s\S]+?)\\end{array\*}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{array\*}${updatedContent}\\end{array\*}`.replace(
              "\\begin{array*} \\\\",
              "\\begin{array*}"
            );
          }
        )
        .replace(
          /\\begin{equation}([\s\S]+?)\\end{equation}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{equation}${updatedContent}\\end{equation}`.replace(
              "\\begin{equation} \\\\",
              "\\begin{equation}"
            );
          }
        )
        .replace(
          /\\begin{equation\*}([\s\S]+?)\\end{equation\*}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{equation\*}${updatedContent}\\end{equation\*}`.replace(
              "\\begin{equation*} \\\\",
              "\\begin{equation*}"
            );
          }
        )
        .replace(
          /\\begin{gathered}([\s\S]+?)\\end{gathered}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{gathered}${updatedContent}\\end{gathered}`.replace(
              "\\begin{gathered} \\\\",
              "\\begin{gathered}"
            );
          }
        )
        .replace(
          /\\begin{gather\*}([\s\S]+?)\\end{gather\*}/g,
          (match, content) => {
            const updatedContent = content.replace(/\n/g, " \\\\\n");
            return `\\begin{gather\*}${updatedContent}\\end{gather\*}`.replace(
              "\\begin{gathered*} \\\\",
              "\\begin{gathered*}"
            );
          }
        )
        // replace $$$$ with $$
        .replace(/\$\$\n\$\$/g, "$$")
    );
  }

  const transformQuestionText = () => {
    try {
      let queText = questionText.replace(
        /\\section\*{Topic ([^}]+)}/g,
        (_, topic) => `##Topic ${topic}##`
      );
      // replace space + [ +AIEEE or space + [ + 20 with \n + match
      const regex = /(\s+\[AIEEE|\s+\[20)/g;
      const transformedPyos = queText.replace(regex, (match) => {
        return `\n${match.trim()}`;
      });
      // remove complete line if line has \section+ anything

      const regex2 = /^.*\\section.*$/gm;
      let removedSectionsLine = transformedPyos.replace(regex2, "");
      removedSectionsLine = formatTableContent(removedSectionsLine);

      const regExToQuestionNo = /\n\$\d+\s/g;
      // find number from \n$ + number + space and replace it with number  space $
      const transformedQuestionNo = removedSectionsLine.replace(
        regExToQuestionNo,
        (match) => {
          const number = match.split("$")[1].trim();
          return `\n${number} $`;
        }
      );

      const transformedSections = transformSections(transformedQuestionNo);
      const optsTransformed = transformAllOptSections(transformedSections);
      console.log({ optsTransformed });
      // const tableRegex =
      //   /\\begin{center}\s*\\begin{tabular}\s*\\hline\n([\s\S]*?)\n\\hline\s*\\end{tabular}\s*\\end{center}/g;
      let transformedText = optsTransformed
        .replace(
          questionBlockStartFinder,
          (match, number) => `\n{{QB}}\n${number}`
        )
        .replace(questionStartFinder, (match, number) => `${number}\n{{Q}}`)
        .replace(pyoFinder, `\n{{PYO}} [`)
        .replace(optionsStartFinder, `\n{{OPB}} `)
        .replace(optionsFinder, `\n{{OP}} `)
        .replaceAll("$\\qquad$", " {{INTEGER_ANSWER}} ")
        .replace(/\\includegraphics\[.*?\]\{(.*?)\}/g, "{{img_$1.jpg_img}}")
        .replace(/\\includegraphics\{smile-(.*?)\}/g, "{{img_$1.jpg_img}}")
        .replace(
          /\\includetblgraphics\[.*?\]\{(.*?)\}/g,
          "{{imgcell_$1.jpg_imgcell}}"
        );
      // .replace(tableRegex, "{{table_$1_table}}");
      // transformedText = formatTableContent(transformedText);
      console.log({ transformedText });
      const questionsList = transformedText.split(`{{QB}}`).slice(1);
      const questions = {} as any;
      questionsList.forEach((question) => {
        if (
          question.includes(` {{INTEGER_ANSWER}} `) &&
          question.includes(`\n{{OP}}`)
        ) {
          message.error(
            `Q.${
              question.split(`\n{{Q}}`)[0]
            } has both integer answer and options`,
            5
          );
          addErrors(
            `Q.${
              question.split(`\n{{Q}}`)[0]
            } has both integer answer and options`
          );
        }
        if (
          !question.includes(` {{INTEGER_ANSWER}} `) &&
          !question.includes(`\n{{OP}}`)
        ) {
          message.error(
            `Q.${
              question.split(`\n{{Q}}`)[0]
            } has NO integer answer and NO options`,
            5
          );
          addErrors(
            `Q.${
              question.split(`\n{{Q}}`)[0]
            } has NO integer answer and NO options`
          );
        }
        if (!question.includes(`{{PYO}}`)) {
          message.error(`Q.${question.split(`\n{{Q}}`)[0]} has no PYO!`, 5);
          addErrors(`Q.${question.split(`\n{{Q}}`)[0]} has no PYO!`);
          // return;
        }
        const questionParts = question
          .split(`\n{{Q}}`)
          .join("###")
          .split(`\n{{PYO}}`)
          .join("###")
          .split(`\n{{OPB}}`)
          .join("###")
          .split("###");
        console.log({ questionParts });
        if (!question.includes(`{{PYO}}`)) {
          questionParts[3] = questionParts[2];
          questionParts[2] = "NA";
        }
        const questionNumber = questionParts[0]?.trim();
        let questionTextPart = questionParts[1]?.trimStart()?.trimEnd();
        let pyoText = questionParts[2]?.trimStart()?.trimEnd();
        // replace ]\n with ]###\n
        // split by ### and take first part as pyoText and second part as questionTextPart
        const splittedPyoText = pyoText.replace("]\n", "]###\n").split("###");
        if (splittedPyoText.length > 1) {
          pyoText = splittedPyoText[0]?.trimStart()?.trimEnd();
          questionTextPart = `${questionTextPart} ${splittedPyoText[1]}`;
        }

        // add intege answer if no integer answer or options exists
        if (
          !questionTextPart.includes(` {{INTEGER_ANSWER}}`) &&
          !questionParts[3]?.includes(`\n{{OP}}`)
        ) {
          questionTextPart = `${questionTextPart} {{INTEGER_ANSWER}} `;
        }

        questions[questionNumber] = {
          question: questionTextPart,
          pyo: pyoText,
          hasIntegerAnswer: !!questionTextPart.includes(`{{INTEGER_ANSWER}}`),
        };

        if (
          !questionTextPart.includes(` {{INTEGER_ANSWER}} `) &&
          questionParts[3]?.includes(`\n{{OP}}`)
        ) {
          const options = questionParts[3].split(`\n{{OP}}`);
          questions[questionNumber].options = options
            .map((option: string) =>
              option?.replace(/\n+$/, "")?.trimStart()?.trimStart()
            )
            .reduce((acc: any, option: string, index: number) => {
              acc[optionNumbers[index + 1]] = option;
              return acc;
            }, {});
        }
      });
      return questions;
    } catch (error) {
      console.log(error);
      message.error("Error in transforming question text", 5);
    }
  };
  const handleQuestionTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setQuestionText(event.target.value?.replaceAll("[0pt]", ""));
  };

  const transformEnumerators = (textContent: string) => {
    return textContent
      .replace(
        /\\begin{enumerate}\s*\\setcounter{enumi}{(\d+)}([\s\S]*?)\\end{enumerate}/g,
        (_, startIndex, body) => {
          let index = parseInt(startIndex, 10) + 1;
          return body.replace(/\s*\\item\s*/g, () => {
            const formatted = index < 10 ? `0${index}` : `${index}`;
            index++;
            return `\n${formatted}. `;
          });
        }
      )
      .replace(/\\begin{enumerate}\s+\\item/g, "01.")
      .replace(/\\end{enumerate}/g, "")
      .replace(/\\begin{center}/g, "")
      .replace(/\\end{center}/g, "");
  };

  const transformSolutionText = () => {
    try {
      let soltext = solutionText.replace(
        /\\section\*{Topic ([^}]+)}/g,
        (_, topic) => `##Topic ${topic}##`
      );
      const regex2 = /^.*\\section.*$/gm;
      const removedSectionsLine = soltext.replace(regex2, "");
      // const transformedSections = transformSections(removedSectionsLine);
      // console.log({ transformedSections });
      // const tableRegex =
      //   /\\begin{center}\s*\\begin{tabular}\s*\\hline\n([\s\S]*?)\n\\hline\s*\\end{tabular}\s*\\end{center}/g;
      let transformedText = formatTableContent(removedSectionsLine);
      transformedText = transformedText
        .replace(
          /\n(\d+).\s/g,
          (match, number) => `\n{{SB}}${number} \n{{Ans}}\n`
        )
        .replace(/\n\(\S+\)\s/g, "$&\n{{Sol}} ")
        .replace(/\\includegraphics\[.*?\]\{(.*?)\}/g, "{{img_$1.jpg_img}}")
        .replace(/\\includegraphics\{smile-(.*?)\}/g, "{{img_$1.jpg_img}}");

      // .replace(tableRegex, "{{table_$1_table}}");
      // transformedText = formatTableContent(transformedText);
      // replace \n + number + space with \n + number + . + space
      transformedText = transformedText.replace(
        /(\n)(\d+)\s/g,
        (match, p1, p2) => {
          return `${p1}${p2}. `;
        }
      );
      // transformedText = transformedText.replace(/\n(\d+ )/g, "\n $1");
      transformedText = transformSections(transformedText);
      console.log({ transformedText });

      const answersList = transformedText.split(`{{SB}}`).slice(1);
      const answers = {} as any;
      answersList.forEach((answer) => {
        const answerParts = answer
          .split(`\n{{Ans}}\n`)
          .join("###")
          .split(`\n{{Sol}}`)
          .join("###")
          .split("###");
        const answerOptions = answerParts[0]?.trim();
        answers[answerOptions] = {
          answer: answerParts[1]?.trimStart()?.trimEnd(),
          solutions: answerParts[2]
            ?.trimStart()
            ?.trimEnd()
            ?.split("Alternate Solution"),
        };
      });
      console.log({ answers: answers });
      return answers;
    } catch (error) {
      console.log(error);
      message.error("Error in transforming solution text", 5);
    }
  };
  const saveQuestions = async () => {
    try {
      if (!filters?.topic?.id) {
        message.error("Select a topic to save questions", 5);
        return;
      }

      const { error } = await supabaseBrowserClient.from("questions").insert(
        questions.map((q) => ({
          question: q.question,
          options: q.options,
          has_integer_answer: q.hasIntegerAnswer,
          answer: q.answer,
          solutions: q.solutions,
          sr_no: q.srNo,
          pyo: q.pyo,
          topic_id: q.topicId,
        }))
      );

      if (error) {
        console.error(error);
        message.error(error.message || "Error in saving questions", 5);
        return;
      }

      message.success("Questions saved successfully");
      setFilters({});
      setQuestionText("");
      setSolutionText("");
      setQuestions([]);
    } catch (error) {
      console.log(error);
      message.error("Error in saving questions", 5);
    }
  };

  const solutionTextChange = (text: string) => {
    const data = transformEnumerators(text);

    // // replace \n + number + space with \n + number + . + space
    // data = data.replace(/(\n)(\d+)\s/g, (match, p1, p2) => {
    //   return `${p1}${p2}. `;
    // });
    // data = data.replace(/\n(\d+ )/g, "\n $1");

    console.log(data);
    setSolutionText(data);
  };

  const handleSolutionTextChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    let data = event.target.value?.replaceAll("[0pt]", "");
    solutionTextChange(data);
  };

  const handleFilterSubmit = (values: Record<string, any>) => {
    setFilters(values);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("Copied!");
  };

  const handleUpdate = (question: any, index: number) => {
    const queList = [...questions];
    queList[index] = question;
    setQuestions(queList);
  };

  return (
    <>
      <Flex gap={24} vertical>
        {noFilters ? null : (
          <DropdownFilters handleFilterSubmit={handleFilterSubmit} />
        )}
        <Flex gap={12}>
          <Flex vertical gap={12} style={{ flex: 1 }}>
            <TextArea
              value={questionText}
              onChange={handleQuestionTextChange}
              rows={30}
              cols={100}
              style={{
                background: "transparent",
                caretColor: "white",
                color: "white",
              }}
            />
          </Flex>
          <Flex vertical gap={12} style={{ flex: 1 }}>
            <TextArea
              value={solutionText}
              onChange={handleSolutionTextChange}
              rows={30}
              cols={100}
              style={{
                background: "transparent",
                caretColor: "white",
                color: "white",
              }}
            />
          </Flex>
          <Flex vertical gap={12} style={{ width: "15rem" }}>
            <Title level={5}>
              Topic {filters?.topic?.order}: {filters?.topic?.name}
            </Title>
            <Button
              type="primary"
              disabled={!solutionText.length || !questionText.length}
              onClick={transformAndMapQuestions}
            >
              Transform Data
              <RightOutlined />
            </Button>
            <Button
              type="primary"
              disabled={!questions?.length}
              onClick={saveQuestions}
            >
              Save
              <SaveOutlined />
            </Button>
          </Flex>
        </Flex>

        <Flex vertical gap={12} style={{ width: "100%" }}>
          {questions?.map((question, index) => (
            <div key={index}>
              <Question
                question={question}
                handleUpdate={(que) => handleUpdate(que, index)}
                topicId={filters?.topic?.id}
                isUpdatedQuestion={previouslyUpdated?.includes(question?.srNo)}
              />
            </div>
          ))}
        </Flex>
      </Flex>
      <FloatButton.BackTop />
    </>
  );
};

export default QuestionComponent;
