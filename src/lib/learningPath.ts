export type Exercise = {
  type: "mcq" | "true_false" | "fill_blank";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFC").replace(/[.,!?;:"'()]/g, "").replace(/\s+/g, " ").trim();

/** Fill-in answers ignore case/punctuation/extra spaces; choice answers must match exactly after normalising. */
export function checkAnswer(ex: Exercise, given: string): boolean {
  return norm(given) === norm(ex.answer) && norm(given).length > 0;
}
