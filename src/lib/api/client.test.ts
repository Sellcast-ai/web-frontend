import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, bffUpload } from "./client";

class FakeFormData {
  entries: [string, unknown][] = [];
  append(key: string, value: unknown) {
    this.entries.push([key, value]);
  }
  get(key: string) {
    return this.entries.find((e) => e[0] === key)?.[1];
  }
}

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
  it("builds product list URLs with defaults and filters", async () => {
    const fetchMock = mockFetch(200, []);
    await api.listProducts();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/products?limit=24&offset=0",
      expect.anything(),
    );

    await api.listProducts({ q: "lamp", category: "home", limit: 5, offset: 10 });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/bff/products?q=lamp&category=home&limit=5&offset=10",
      expect.anything(),
    );
  });

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

  it("approveStoryboard POSTs to the approve endpoint", async () => {
    const fetchMock = mockFetch(200, { id: "j1" });
    await api.approveStoryboard("j1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/bff/video-jobs/j1/storyboard/approve");
    expect(init.method).toBe("POST");
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

  it("rejects with an ApiError on network failure", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const promise = bffUpload("products", {});
    FakeXHR.last.onerror?.();

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 0 });
  });
});

describe("uploadReferenceVideo", () => {
  // Backend contract (built in parallel): POST /uploads/reference-video,
  // multipart/form-data, file field named "file", 200 -> { url: "<r2 url>" }.
  it("posts the file as multipart, reports progress, and returns the url", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    vi.stubGlobal("FormData", FakeFormData);
    const file = { name: "clip.mp4", type: "video/mp4", size: 1024 } as unknown as File;
    const fractions: number[] = [];
    const promise = api.uploadReferenceVideo(file, (f) => fractions.push(f));
    const xhr = FakeXHR.last;

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/bff/uploads/reference-video");
    // The browser sets the multipart boundary; we must NOT force a Content-Type.
    expect(xhr.headers["Content-Type"]).toBeUndefined();
    expect((xhr.body as unknown as FakeFormData).get("file")).toBe(file);

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ url: "https://r2.example/ref/clip.mp4" });
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ url: "https://r2.example/ref/clip.mp4" });
    expect(fractions).toEqual([0.5]);
  });

  it("rejects with the backend detail message on an error status", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    vi.stubGlobal("FormData", FakeFormData);
    const file = { name: "clip.mp4", type: "video/mp4", size: 1024 } as unknown as File;
    const promise = api.uploadReferenceVideo(file);
    const xhr = FakeXHR.last;

    xhr.status = 413;
    xhr.responseText = JSON.stringify({ detail: "File too large" });
    xhr.onload?.();

    await expect(promise).rejects.toMatchObject({
      name: "ApiError",
      status: 413,
      message: "File too large",
    });
  });
});
