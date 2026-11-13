You are given a screenshot/image of a multiple-choice question
along with options and the correct answer.

Your task is to generate a clean,
mobile-responsive,
KaTeX-compatible
5 to 8 step solution in LaTeX format.

IMPORTANT RULES:

1. Output ONLY raw LaTeX code.

2. ALWAYS output inside a copyable fenced code block.

3. NEVER render LaTeX.

4. Do NOT include markdown explanations outside code block.

5. Do NOT include HTML tags.

6. Use ONLY KaTeX-compatible LaTeX.

7. Every solution MUST contain
   minimum 5 and maximum 8 logical steps.

8. Keep explanations concise,
   exam-oriented,
   and easy to understand.

9. Final answer must NOT include:

   $$
   \boxed{\text{Correct Option: (x)}}
   $$

10. NEVER include:

    $$
    \textbf{Solution}
    $$

11. ALWAYS use:

    $$
    \begin{aligned}
    ...
    \end{aligned}
    $$

12. ALWAYS wrap every block using:

    $$
    ...
    $$

13. NEVER use:
    \[
    \]

14. Structure MUST always follow:

$$
\begin{aligned}
1.\;& \text{Step 1 explanation}
\end{aligned}
$$

$$
\begin{aligned}
2.\;& \text{Step 2 explanation}
\end{aligned}
$$

$$
\begin{aligned}
3.\;& \text{Step 3 explanation}
\end{aligned}
$$

$$
\begin{aligned}
4.\;& \text{Step 4 explanation}
\end{aligned}
$$

$$
\begin{aligned}
5.\;& \text{Step 5 explanation}
\end{aligned}
$$

Optional additional blocks:

$$
\begin{aligned}
6.\;& \text{Step 6 explanation}
\end{aligned}
$$

$$
\begin{aligned}
7.\;& \text{Step 7 explanation}
\end{aligned}
$$

$$
\begin{aligned}
8.\;& \text{Final logical conclusion}
\end{aligned}
$$

15. Step meaning guideline:

Step 1 → Understand given information

Step 2 → Relevant formula/concept/fact

Step 3 → Apply formula or logic

Step 4 → Intermediate simplification

Step 5 → Further calculation/elimination

Step 6 → Verification/checking

Step 7 → Final matching/result

Step 8 → Final concise conclusion

16. VERY IMPORTANT:
    Keep content mobile responsive.

17. Avoid horizontal overflow.

18. Do NOT create very long single lines.

19. Also avoid breaking lines too aggressively.

20. Preferred line size:
    8–14 words per line.

21. Break lines ONLY when logically needed.

22. Keep natural sentence flow.

23. Example of GOOD formatting:

$$
\begin{aligned}
2.\;& \text{Planck constant relates} \\
& \text{energy and frequency.}
\end{aligned}
$$

24. Example of BAD formatting:

$$
\begin{aligned}
2.\;& \text{Planck} \\
& \text{constant} \\
& \text{relates energy}
\end{aligned}
$$

25. Use continuation alignment:
    &
    for wrapped lines.

26. Use concise wording.

27. Do NOT write huge text paragraphs.

28. Prefer short logical statements.

29. Keep equations compact whenever possible.

30. Mathematical expressions may remain in one line
    if they fit properly on mobile screens.

31. Use proper mathematical formatting:

- fractions
- exponents
- vectors
- units
- matrices
- inequalities
- chemical equations

32. Use proper spacing:
    \,
    \quad
    \cdot

33. Prefer symbols like:
    \therefore
    \Rightarrow

34. Avoid unnecessary blank lines
    inside aligned environments.

35. Keep formatting visually balanced.

36. Final answer should always be the last block.

37. NEVER explain outside LaTeX.

38. Output should be renderable cleanly
    inside narrow mobile containers
    without horizontal scrolling.

39. ALWAYS output raw LaTeX code only,
    never rendered math.

40. Flag if answer given in screenshot is incorrect.

41. Never include:
    "correct option is ..."
    or similar statements,
    because answer is stored separately.

42. If screenshot answer is incorrect,
    mention corrected result naturally
    inside final logical step only.
