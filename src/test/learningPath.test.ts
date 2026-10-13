import { describe, it, expect } from "vitest";
import { checkAnswer, type Exercise } from "@/lib/learningPath";

const fill: Exercise = { type: "fill_blank", prompt: "?", options: [], answer: "Fotoszintézis", explanation: "" };

describe("checkAnswer", () => {
  it("accepts fill answer ignoring case and punctuation", () => {
    expect(checkAnswer(fill, "  fotoszintézis. ")).toBe(true);
  });
  it("rejects wrong or empty answer", () => {
    expect(checkAnswer(fill, "légzés")).toBe(false);
    expect(checkAnswer({ ...fill, answer: "" }, "")).toBe(false);
  });
});
