import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVersion, safeGetVersion } from "../src/index.js";

describe("getVersion() and safeGetVersion()", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {}); // silence warnings in tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns version info when server responds correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { blockchain_version: "1.2.3" } }),
    });

    const version = await getVersion("https://example.com", mockFetch);
    expect(version).toEqual({ server: "https://example.com", version: "1.2.3" });
  });

  it("throws if fetch returns non-ok status", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(getVersion("https://example.com", mockFetch)).rejects.toThrow(
      "https://example.com returned 500"
    );
  });

  it("throws if no version info is returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: {} }),
    });

    await expect(getVersion("https://example.com", mockFetch)).rejects.toThrow(
      "No version info from https://example.com"
    );
  });

  it("safeGetVersion returns version if getVersion succeeds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { blockchain_version: "2.0.0" } }),
    });

    const version = await safeGetVersion("https://example.com", mockFetch);
    expect(version).toEqual({ server: "https://example.com", version: "2.0.0" });
  });

  it("safeGetVersion logs warning and rethrows if getVersion fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(safeGetVersion("https://example.com", mockFetch)).rejects.toThrow(
      "https://example.com returned 500"
    );

    expect(console.warn).toHaveBeenCalledWith(
      "Version check failed for https://example.com: https://example.com returned 500"
    );
  });
});
