import { describe, expect, it } from "vitest";
import { normalizeOrigin } from "./site-url";

describe("normalizeOrigin", () => {
  it("strips trailing slashes and paths", () => {
    expect(normalizeOrigin("https://example.com/")).toBe("https://example.com");
    expect(normalizeOrigin("https://example.com/foo")).toBe("https://example.com");
  });

  it("assumes https for a bare host (as Vercel injects it)", () => {
    expect(normalizeOrigin("web-frontend-ten-nu.vercel.app")).toBe(
      "https://web-frontend-ten-nu.vercel.app",
    );
  });

  it("keeps an explicit scheme and port", () => {
    expect(normalizeOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
