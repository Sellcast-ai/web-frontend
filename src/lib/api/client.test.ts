import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, apiErrorMessage, bffUpload } from "./client";

function mockFetch(status: number, body: unknown = null) {
  const fn = vi.fn(async () =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      statusText: status === 502 ? "Bad Gateway" : "",
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api (BFF client)", () => {
  it("serializes json payloads with a Content-Type header", async () => {
    const fetchMock = mockFetch(200, {});
    await api.parseProductUrl("https://example.com/p/1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/products/parse");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ url: "https://example.com/p/1" }));
  });

  it("returns null for empty response bodies", async () => {
    mockFetch(204);
    await expect(api.deleteAvatar("a1")).resolves.toBeNull();
  });

  it("throws an ApiError, not a raw SyntaxError, on a malformed 2xx body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>gateway</html>", { status: 200 })),
    );
    await expect(api.getUsage()).rejects.toBeInstanceOf(ApiError);
    await expect(api.getUsage()).rejects.toMatchObject({ status: 200 });
  });

  it("throws ApiError with the backend detail message", async () => {
    mockFetch(422, { detail: "invalid url" });
    const err = await api.parseProductUrl("nope").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.message).toBe("invalid url");
  });

  it("falls back to statusText, then a generic message, for unusable errors", async () => {
    mockFetch(502);
    await expect(api.getUsage()).rejects.toMatchObject({
      status: 502,
      message: "Bad Gateway",
    });

    mockFetch(400, { detail: [{ loc: ["body"], msg: "boom" }] });
    await expect(api.getUsage()).rejects.toMatchObject({
      status: 400,
      message: "Request failed",
    });
  });

  it("never yields an empty message when statusText is blank (HTTP/2)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>gateway timeout</html>", { status: 504 })),
    );
    await expect(api.getUsage()).rejects.toMatchObject({
      status: 504,
      message: "Request failed",
    });
  });

  it("only marks a body-supplied message as displayable", async () => {
    mockFetch(422, { detail: "invalid url" });
    const detail = await api.parseProductUrl("nope").catch((e) => e);
    expect(apiErrorMessage(detail, "localized fallback")).toBe("invalid url");

    // Status phrase, client generic, malformed 2xx body and a non-ApiError all
    // carry untranslated English, so the call site's own locale string wins.
    mockFetch(502);
    const gateway = await api.getUsage().catch((e) => e);
    expect(gateway.message).toBe("Bad Gateway");
    expect(apiErrorMessage(gateway, "localized fallback")).toBe("localized fallback");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>gateway timeout</html>", { status: 504 })),
    );
    const timeout = await api.getUsage().catch((e) => e);
    expect(apiErrorMessage(timeout, "localized fallback")).toBe("localized fallback");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>not json</html>", { status: 200 })),
    );
    const malformed = await api.getUsage().catch((e) => e);
    expect(apiErrorMessage(malformed, "localized fallback")).toBe("localized fallback");

    expect(apiErrorMessage(new TypeError("boom"), "localized fallback")).toBe(
      "localized fallback",
    );
  });

  it("never treats a bare 5xx detail as user copy, only an error_type-backed one", async () => {
    // Operator prose on a 500 is untranslated English never written for users.
    mockFetch(500, { detail: "Unexpected server error" });
    const unexpected = await api.getUsage().catch((e) => e);
    expect(unexpected.message).toBe("Request failed");
    expect(apiErrorMessage(unexpected, "localized fallback")).toBe("localized fallback");

    mockFetch(500, { detail: "Database operation failed" });
    const db = await api.getUsage().catch((e) => e);
    expect(apiErrorMessage(db, "localized fallback")).toBe("localized fallback");

    // A structured error_type is how the backend marks a deliberate
    // user-facing 5xx message (the SMS-unconfigured 503), so it stays.
    mockFetch(503, {
      detail: "SMS verification is not available right now.",
      error_type: "SmsNotConfiguredError",
    });
    const sms = await api.sendPhoneCode("+15551234567").catch((e) => e);
    expect(apiErrorMessage(sms, "localized fallback")).toBe(
      "SMS verification is not available right now.",
    );

    // 4xx prose keeps winning: curated backend messages are deliberate there.
    mockFetch(429, { detail: "Too many failed verification attempts." });
    const quota = await api.getUsage().catch((e) => e);
    expect(apiErrorMessage(quota, "localized fallback")).toBe(
      "Too many failed verification attempts.",
    );
  });

  it("approveStoryboard POSTs to the approve endpoint", async () => {
    const fetchMock = mockFetch(200, { id: "j1" });
    await api.approveStoryboard("j1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/video-jobs/j1/storyboard/approve");
    expect(init.method).toBe("POST");
  });

  it("fetches video capabilities through the BFF proxy", async () => {
    const fetchMock = mockFetch(200, [
      {
        mode: "product_only",
        available: true,
        aspect_ratios: ["9:16"],
        languages: null,
        beat_durations: [5, 10],
        max_resolution: "1080p",
        models: [],
      },
    ]);
    await api.getVideoCapabilities();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/video/capabilities");
    expect(init.method).toBeUndefined();
  });

  it("patchStoryboard PATCHes the edited VideoScript as JSON", async () => {
    const fetchMock = mockFetch(200, { id: "j1" });
    const sb = {
      audience: "a",
      buying_points: ["b"],
      hook_angle: "h",
      persona: "p",
      shots: [],
    };
    await api.patchStoryboard("j1", sb);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/video-jobs/j1/storyboard");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify(sb));
  });

  it("createVideoJob POSTs the reference_url field when supplied", async () => {
    const fetchMock = mockFetch(201, { id: "j1" });
    await api.createVideoJob({
      product_id: "prod-1",
      mode: "ai_avatar",
      style: "avatar_talking_intro",
      vibe: "fun_fast",
      reference_url: "https://www.tiktok.com/@shop/video/123",
      duration_seconds: 15,
      language: "en",
      video_model: "seedance-2.0",
      resolution: "720p",
      avatar_id: null,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/video-jobs");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      reference_url: "https://www.tiktok.com/@shop/video/123",
    });
  });

  it("me() maps 401 to null but rethrows other errors", async () => {
    mockFetch(401, { detail: "unauthenticated" });
    await expect(api.me()).resolves.toBeNull();

    mockFetch(500, { detail: "boom" });
    await expect(api.me()).rejects.toMatchObject({ status: 500 });
  });

  describe("getVideoQuote", () => {
    it("asks the BFF for exactly the configuration on screen", async () => {
      const fetchMock = mockFetch(200, { credits: 225 });
      await api.getVideoQuote({
        mode: "product_only",
        duration_seconds: 15,
        resolution: "720p",
        aspect_ratio: "9:16",
        video_model: "seedance-2.0",
      });

      const [url] = fetchMock.mock.calls[0] as unknown as [string];
      const parsed = new URL(url, "http://local");
      expect(parsed.pathname).toBe("/api/bff/video-jobs/quote");
      expect(Object.fromEntries(parsed.searchParams)).toEqual({
        mode: "product_only",
        duration_seconds: "15",
        resolution: "720p",
        aspect_ratio: "9:16",
        video_model: "seedance-2.0",
      });
    });

    // Omitted, never sent empty: the backend then prices the mode's own default
    // model instead of rejecting a blank picker key.
    it("omits video_model when there is none to send", async () => {
      const fetchMock = mockFetch(200, { credits: 225 });
      await api.getVideoQuote({
        mode: "product_only",
        duration_seconds: 15,
        resolution: "720p",
        aspect_ratio: "9:16",
      });

      const [url] = fetchMock.mock.calls[0] as unknown as [string];
      expect(new URL(url, "http://local").searchParams.has("video_model")).toBe(false);
    });
  });
});

type UploadProgressEvent = { lengthComputable: boolean; loaded: number; total: number };

class FakeXHR {
  static last: FakeXHR;
  upload: { onprogress: ((e: UploadProgressEvent) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  statusText = "";
  responseText = "";
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: string | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  send(body: string) {
    this.body = body;
    FakeXHR.last = this;
  }
}

describe("bffUpload", () => {
  it("posts JSON to the BFF, reports upload fractions, and resolves the parsed body", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const fractions: number[] = [];
    const promise = bffUpload<{ id: string }>("products", { title: "x" }, (f) =>
      fractions.push(f),
    );
    const xhr = FakeXHR.last;

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/bff/products");
    expect(xhr.headers["Content-Type"]).toBe("application/json");
    expect(xhr.body).toBe(JSON.stringify({ title: "x" }));

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 200, total: 200 });
    xhr.status = 201;
    xhr.responseText = JSON.stringify({ id: "p1" });
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ id: "p1" });
    expect(fractions).toEqual([0.25, 1]);
  });

  it("ignores progress events without a computable length", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const fractions: number[] = [];
    const promise = bffUpload("avatars", {}, (f) => fractions.push(f));
    const xhr = FakeXHR.last;

    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 10, total: 0 });
    xhr.status = 200;
    xhr.responseText = "null";
    xhr.onload?.();

    await promise;
    expect(fractions).toEqual([]);
  });

  it("rejects with the backend detail message on an error status", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const promise = bffUpload("products", {});
    const xhr = FakeXHR.last;

    xhr.status = 422;
    xhr.responseText = JSON.stringify({ detail: "Title is too short" });
    xhr.onload?.();

    await expect(promise).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Title is too short",
    });
  });

  it("falls back to statusText when the error body is not JSON", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const promise = bffUpload("products", {});
    const xhr = FakeXHR.last;

    xhr.status = 502;
    xhr.statusText = "Bad Gateway";
    xhr.responseText = "<html>upstream error</html>";
    xhr.onload?.();

    await expect(promise).rejects.toMatchObject({
      status: 502,
      message: "Bad Gateway",
    });
  });

  it("carries the structured error_type through, like the fetch path", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const promise = bffUpload("products", {});
    const xhr = FakeXHR.last;

    xhr.status = 503;
    xhr.responseText = JSON.stringify({
      detail: "SMS verification is not available right now.",
      error_type: "SmsNotConfiguredError",
    });
    xhr.onload?.();

    await expect(promise).rejects.toMatchObject({
      status: 503,
      errorType: "SmsNotConfiguredError",
    });
  });

  it("rejects rather than throwing out of the XHR callback on a malformed 2xx body", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const promise = bffUpload("products", {});
    const xhr = FakeXHR.last;

    xhr.status = 200;
    xhr.responseText = "<html>not json</html>";
    expect(() => xhr.onload?.()).not.toThrow();

    await expect(promise).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects with an ApiError on network failure", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const promise = bffUpload("products", {});
    FakeXHR.last.onerror?.();

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 0 });
  });
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("uploadReferenceVideo", () => {
  // Backend contract (built in parallel): POST /uploads/reference-video/presign
  // { filename, content_type, size } -> { upload_url, public_url, key }; the
  // browser then PUTs the bytes DIRECTLY to upload_url (not via the BFF) so
  // large clips don't hit serverless body limits.
  it("presigns, PUTs the bytes directly, reports progress, and returns the public url", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const fetchMock = mockFetch(200, {
      upload_url: "https://storage.example/put?sig=abc",
      public_url: "https://r2.example/ref/clip.mp4",
      key: "ref/clip.mp4",
    });
    const file = { name: "clip.mp4", type: "video/mp4", size: 1024 } as unknown as File;
    const fractions: number[] = [];
    const promise = api.uploadReferenceVideo(file, (f) => fractions.push(f));

    await flush();
    const [presignUrl, presignInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(presignUrl).toBe("/api/bff/uploads/reference-video/presign");
    expect(presignInit.method).toBe("POST");
    expect(presignInit.body).toBe(
      JSON.stringify({ filename: "clip.mp4", content_type: "video/mp4", size: 1024 }),
    );

    const xhr = FakeXHR.last;
    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("https://storage.example/put?sig=abc");
    // Bytes go straight to storage with the file's own Content-Type — no BFF.
    expect(xhr.headers["Content-Type"]).toBe("video/mp4");
    expect(xhr.body).toBe(file);

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    xhr.status = 200;
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ url: "https://r2.example/ref/clip.mp4" });
    expect(fractions).toEqual([0.5]);
  });

  it("rejects when the direct storage PUT fails", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    mockFetch(200, {
      upload_url: "https://storage.example/put?sig=abc",
      public_url: "https://r2.example/ref/clip.mp4",
      key: "ref/clip.mp4",
    });
    const file = { name: "clip.mp4", type: "video/mp4", size: 1024 } as unknown as File;
    const promise = api.uploadReferenceVideo(file);

    await flush();
    const xhr = FakeXHR.last;
    xhr.status = 403;
    xhr.statusText = "Forbidden";
    xhr.onload?.();

    await expect(promise).rejects.toMatchObject({ name: "ApiError", status: 403 });
  });

  it("rejects when the presign handshake fails, before any PUT", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    FakeXHR.last = undefined as unknown as FakeXHR;
    mockFetch(422, { detail: "Unsupported file type" });
    const file = { name: "clip.mp4", type: "video/mp4", size: 1024 } as unknown as File;

    await expect(api.uploadReferenceVideo(file)).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Unsupported file type",
    });
    expect(FakeXHR.last).toBeUndefined();
  });
});
