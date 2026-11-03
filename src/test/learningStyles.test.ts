import { describe, it, expect } from "vitest";
import { QUIZ, STYLES, scoreQuiz } from "@/lib/learningStyles";

describe("learning style quiz", () => {
  it("has 45 questions covering all 8 styles", () => {
    expect(QUIZ).toHaveLength(45);
    expect(STYLES).toHaveLength(8);
    for (const s of STYLES) expect(QUIZ.some((q) => q.style === s.value)).toBe(true);
  });
  it("picks the style with the highest percentage", () => {
    const answers = QUIZ.map((q) => (q.style === "practice" ? 2 : 0));
    const r = scoreQuiz(answers);
    expect(r.top).toBe("practice");
    expect(r.scores.practice).toBe(100);
    expect(r.scores.visual).toBe(0);
  });
});
