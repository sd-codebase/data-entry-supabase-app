"use client";
import { useRef, useEffect } from "react";
import "katex/dist/katex.min.css";
import "./solution-expression.css";
// @ts-ignore — no bundled types for auto-render
import renderMathInElement from "katex/contrib/auto-render";

export const SolutionExpression = ({ solution }: { solution: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = solution ? solution.replace(/\n/g, " ") : "";
    if (!solution) return;
    renderMathInElement(ref.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
    ref.current.querySelectorAll<HTMLElement>(".katex-display").forEach((el) => {
      el.style.textAlign = "left";
    });
    ref.current.querySelectorAll<HTMLElement>(".katex-display > .katex").forEach((el) => {
      el.style.textAlign = "left";
    });
    ref.current.querySelectorAll<HTMLElement>(".katex").forEach((el) => {
      el.style.whiteSpace = "normal";
    });
  }, [solution]);

  return (
    <div ref={ref} className="solution-expression" style={{ overflowX: "auto", lineHeight: 1.8 }} />
  );
};
