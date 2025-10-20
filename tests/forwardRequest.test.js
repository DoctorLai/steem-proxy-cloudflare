import { describe, it, expect, vi } from "vitest";
import { forwardRequest } from "../src/index.js";

describe("forwardRequest()", () => {
  it("forwards a GET request successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"message":"ok"}',
    });

    const result = await forwardRequest("https://example.com", null, "GET", mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual({ statusCode: 200, text: '{"message":"ok"}' });
  });

  it("forwards a POST request with JSON body", async () => {
    const body = { key: "value" };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => '{"success":true}',
    });

    const result = await forwardRequest("https://example.com/api", body, "POST", mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    const callOptions = mockFetch.mock.calls[0][1];
    expect(callOptions.method).toBe("POST");
    expect(callOptions.body).toBe(JSON.stringify(body));
    expect(result).toEqual({ statusCode: 201, text: '{"success":true}' });
  });

  it("throws if fetchFn rejects", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    await expect(forwardRequest("https://example.com", null, "GET", mockFetch)).rejects.toThrow(
      "Network Error"
    );

    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
