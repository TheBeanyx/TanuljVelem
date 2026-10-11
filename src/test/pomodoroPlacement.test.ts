import { describe, expect, it } from "vitest";
import { pomodoroPlacement } from "@/lib/pomodoro";

describe("Pomodoro page and floating placement", () => {
  it("shows the timer on its page before starting", () => {
    expect(pomodoroPlacement("/pomodoro", false, false)).toBe("page");
  });
  it("floats the started timer when navigating to homework", () => {
    expect(pomodoroPlacement("/dashboard", true, false)).toBe("floating");
  });
  it("restores the timer to its page on return even with an external window", () => {
    expect(pomodoroPlacement("/pomodoro", true, true)).toBe("page");
  });
  it("keeps an explicitly opened external window on other pages", () => {
    expect(pomodoroPlacement("/dashboard", true, true)).toBe("external");
  });
  it("does not float a timer that has not been activated", () => {
    expect(pomodoroPlacement("/dashboard", false, false)).toBe("hidden");
  });
});