/**
 * The two price reads must retry and re-poll exactly the failures that can
 * still come good, because the approve bar's copy is chosen from the same
 * split: a 5xx or a dead socket says "we're still trying", a 4xx says the cost
 * can't be worked out at all. A hook that promised one and did the other would
 * leave the user waiting at the click that spends hundreds of credits.
 *
 * Captured straight off `useQuery` so this is the wiring, not a restatement of
 * the predicate.
 */
import { describe, expect, it, vi } from "vitest";

type Options = {
  retry: (count: number, err: unknown) => boolean;
  refetchInterval: (query: { state: { status: string; error: unknown } }) => number | false;
};

let last: Options;
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQuery: (options: Options) => {
    last = options;
    return {};
  },
}));

const { ApiError } = await import("./client");
const { useVideoCapabilities, useVideoQuote } = await import("./hooks");

const quoted = {
  mode: "product_only" as const,
  duration_seconds: 30,
  resolution: "1080p",
  aspect_ratio: "9:16",
  video_model: "seedance-2.0",
};

const errored = (error: unknown) => ({ state: { status: "error", error } });

describe.each([
  ["capabilities", () => useVideoCapabilities()],
  ["quote", () => useVideoQuote(quoted)],
])("%s read recovers from what can recover", (_name, mount) => {
  const options = () => {
    mount();
    return last;
  };

  it("stops dead on a 4xx: the backend's settled answer about this request", () => {
    const notFound = new ApiError(404, "Not Found");
    expect(options().retry(0, notFound)).toBe(false);
    expect(options().refetchInterval(errored(notFound))).toBe(false);

    const refused = new ApiError(422, "Unprocessable Entity");
    expect(options().retry(0, refused)).toBe(false);
    expect(options().refetchInterval(errored(refused))).toBe(false);
  });

  it("keeps working at a 5xx or a dead socket", () => {
    const down = new ApiError(503, "Service Unavailable");
    expect(options().retry(0, down)).toBe(true);
    expect(options().refetchInterval(errored(down))).toBe(60_000);

    // A dropped connection never reaches `errorFrom`, so it isn't an ApiError
    // at all - and it is the most transient failure there is.
    const socket = new TypeError("Failed to fetch");
    expect(options().retry(0, socket)).toBe(true);
    expect(options().refetchInterval(errored(socket))).toBe(60_000);
  });

  it("polls only while errored", () => {
    expect(options().refetchInterval({ state: { status: "success", error: null } })).toBe(
      false,
    );
  });
});
