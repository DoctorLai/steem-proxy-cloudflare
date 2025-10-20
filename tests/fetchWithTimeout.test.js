import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "../src/index.js";

describe("fetchWithTimeout()", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.useFakeTimers(); // enable fake timers globally
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves successfully before timeout", async () => {
    // Mock a fast fetch
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ message: "success" }),
      text: async () => JSON.stringify({ message: "success" }),
    }));

    const promise = fetchWithTimeout("https://example.com", {}, 1000);

    // Run all timers in case fetchWithTimeout uses setTimeout internally
    vi.runAllTimers();
    await vi.runAllTicks();

    const res = await promise;
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.message).toBe("success");
  });

  it("rejects when fetch takes too long", async () => {
    // Mock a fetch that never resolves
    global.fetch = vi.fn(({ signal } = {}) =>
      new Promise((resolve, reject) => {
        if (signal) {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }
        // never resolve to simulate a slow fetch
      })
    );

    const promise = fetchWithTimeout("https://slow.example.com", {}, 50);

    // Advance fake timers past the timeout to trigger abort
    vi.advanceTimersByTime(100);

    // Run microtasks so the abort callback fires
    await vi.runAllTicks();

    await expect(promise).rejects.toThrow(/Timeout|abort/i);
  });

  it("clears timeout after success to prevent leaks", async () => {
    const clearSpy = vi.spyOn(global, "clearTimeout");

    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    }));

    const promise = fetchWithTimeout("https://example.com", {}, 200);

    vi.runAllTimers(); // trigger any setTimeout inside fetchWithTimeout
    await vi.runAllTicks();

    await promise;

    expect(clearSpy).toHaveBeenCalled();
  });
});
