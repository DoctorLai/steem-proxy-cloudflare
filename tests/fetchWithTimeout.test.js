import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "../src/index.js";

describe("fetchWithTimeout()", () => {
  let originalFetch;

  beforeEach(() => {
    // Save the original fetch
    originalFetch = global.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("resolves when fetch responds quickly", async () => {
    global.fetch = vi.fn(() => Promise.resolve(new Response("ok", { status: 200 })));

    const response = await fetchWithTimeout("http://example.com", {}, 1000);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("rejects when fetch takes too long", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });

    const fetchPromise = fetchWithTimeout("http://example.com", {}, 50);
    const rejection = expect(fetchPromise).rejects.toThrow("aborted");

    await vi.advanceTimersByTimeAsync(50);
    await rejection;
  });

  it("honors an external AbortController signal", async () => {
    const controller = new AbortController();

    global.fetch = vi.fn((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });

    const fetchPromise = fetchWithTimeout(
      "http://example.com",
      { signal: controller.signal },
      1000
    );

    controller.abort();

    await expect(fetchPromise).rejects.toThrow("aborted");
  });
});
