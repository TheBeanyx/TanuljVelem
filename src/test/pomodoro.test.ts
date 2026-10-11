import { describe, expect, it } from "vitest";
import { remainingSeconds } from "@/lib/pomodoro";

describe("persistent Pomodoro deadline", () => {
  it("keeps elapsed time when moving between pages", () => {
    const deadline = 1000 + 1500 * 1000;
    expect(remainingSeconds(deadline, 61_000)).toBe(1440);
  });
  it("accounts for time spent on another website without ticking", () => {
    expect(remainingSeconds(1_501_000, 601_000)).toBe(900);
  });
  it("never counts below zero after expiry", () => {
    expect(remainingSeconds(1000, 3000)).toBe(0);
  });
});