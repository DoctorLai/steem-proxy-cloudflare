import { describe, it, expect } from "vitest";
import { compareVersion } from "../src/index.js";

describe("compareVersion", () => {
  it("returns 0 for identical versions", () => {
    expect(compareVersion("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersion("0.0.0", "0.0.0")).toBe(0);
    expect(compareVersion("10.20.30", "10.20.30")).toBe(0);
  });

  it("returns 1 when first version is greater", () => {
    expect(compareVersion("1.2.4", "1.2.3")).toBe(1);
    expect(compareVersion("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersion("1.10", "1.2")).toBe(1); // different length
  });

  it("returns -1 when first version is smaller", () => {
    expect(compareVersion("1.2.3", "1.2.4")).toBe(-1);
    expect(compareVersion("1.9.9", "2.0.0")).toBe(-1);
    expect(compareVersion("1.2", "1.10")).toBe(-1); // different length
  });

  it("handles versions with different lengths correctly", () => {
    expect(compareVersion("1.2", "1.2.0")).toBe(0);
    expect(compareVersion("1.2.1", "1.2")).toBe(1);
    expect(compareVersion("1.2", "1.2.1")).toBe(-1);
  });

  it("handles single-number versions", () => {
    expect(compareVersion("1", "1")).toBe(0);
    expect(compareVersion("2", "1")).toBe(1);
    expect(compareVersion("1", "2")).toBe(-1);
  });

  it("handles zero-padding correctly", () => {
    expect(compareVersion("01.002.03", "1.2.3")).toBe(0);
    expect(compareVersion("1.02", "1.2.1")).toBe(-1);
  });
});
