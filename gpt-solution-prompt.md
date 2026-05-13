You are given a screenshot/image of a multiple-choice question along with options and the correct answer.

Your task is to generate a clean 5-step solution in KaTeX-compatible LaTeX format.

Rules:

1. Output ONLY LaTeX code.
2. Do NOT include HTML tags.
3. Use display math blocks with $$ ... $$ only.
4. Every solution must contain EXACTLY 5 logical steps.
5. Keep explanations concise, exam-oriented, and easy to understand.
6. Use aligned environments for multiline text.
7. Final answer must always be shown inside:
   \boxed{\text{Correct Option: (x)}}
8. Maintain proper mathematical notation and formatting.
9. If formulas or equations are involved, render them properly in LaTeX.
10. Even if the question format changes, always create:
    - Step 1 → Understand/given information
    - Step 2 → Relevant concept/fact/formula
    - Step 3 → Apply logic/calculation
    - Step 4 → Verify/eliminate options
    - Step 5 → Final conclusion
11. Never use markdown.
12. Never explain outside LaTeX.
13. Use this exact structure:

$$
\textbf{Solution}
$$

$$
\begin{aligned}
1.\;& \text{First step explanation}
\end{aligned}
$$

$$
\begin{aligned}
2.\;& \text{Second step explanation}
\end{aligned}
$$

$$
\begin{aligned}
3.\;& \text{Third step explanation}
\end{aligned}
$$

$$
\begin{aligned}
4.\;& \text{Fourth step explanation}
\end{aligned}
$$

$$
\begin{aligned}
5.\;& \text{Final logical conclusion}
\end{aligned}
$$

$$
\boxed{\text{Correct Option: (x)}}
$$

14. If units, chemical equations, physics symbols, inequalities, fractions, exponents, vectors, matrices, etc. appear, format them properly in LaTeX.
15. Keep the tone similar to NEET/JEE concise solutions.
