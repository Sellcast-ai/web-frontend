/**
 * Evidence harness for the PR-5b i18n extraction: render the real Studio and
 * Jobs page components through the real next-intl `en` catalog and assert the
 * user-facing English copy actually resolves (a missing/typo'd key throws in
 * next-intl, so this is the failure mode that matters). Also dumps the rendered
 * HTML to the evidence dir so a reviewer can open the actual surface.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeAll } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import en from "../../messages/en.json";
import { qk } from "@/lib/api/hooks";
import { VIDEO_ASPECT_RATIOS } from "@/lib/api/types";
import type { ProductSummary, Usage, VideoJob } from "@/lib/api/types";

// The pages call these; none are exercised for a static render.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("product=prod-1"),
  useParams: () => ({ id: "job-1" }),
}));

const EVIDENCE_DIR =
  "/var/folders/dl/ss70wk2x45b39_4pclg537_m0000gn/T/no-mistakes-evidence/01KY4SBQQR1YSQ39XRGSE4KCG4";

const product: ProductSummary = {
  id: "prod-1",
  external_product_id: null,
  title: "Aurora Ceramic Pour-Over Coffee Set",
  subtitle: "Slow-brew ritual kit",
  category_display: "Kitchen",
  category_path: null,
  shop_name: "Aurora Home",
  status: null,
  country_code: "US",
  price_min: 4200,
  price_max: 4200,
  commission_rate: null,
  monthly_sales: null,
  total_sales: null,
  total_revenue: null,
  creator_count_active: null,
  total_views: null,
  sales_mom_pct: null,
  cover_image_url: null,
  hero_image_urls: [],
  detail_image_urls: [],
  is_liked: false,
  owner_user_id: null,
  source_platform: "shopify",
  source_url: null,
};

const usage: Usage = {
  plan: "starter",
  limit: 300,
  used: 120,
  remaining: 180,
  resets_at: "2026-08-01T00:00:00Z",
};

const baseJob: VideoJob = {
  id: "job-1",
  user_id: "u-1",
  product_id: "prod-1",
  provider: "byteplus",
  provider_model: "seedance-2.0",
  status: "awaiting_storyboard",
  mode: "ai_avatar",
  style: "avatar_talking_intro",
  duration_seconds: 15,
  aspect_ratio: "9:16",
  prompt: "",
  video_url: null,
  download_url: null,
  thumbnail_url: null,
  error_message: null,
  created_at: "2026-07-20T00:00:00Z",
  updated_at: "2026-07-20T00:00:00Z",
  completed_at: null,
  product_name: "Aurora Ceramic Pour-Over Coffee Set",
  product_image_url: null,
  reference_used: false,
  reference_video_source: null,
  synthesized_prompt: null,
  review_mode: false,
  storyboard: {
    audience: "Home baristas",
    buying_points: ["Even extraction", "Heat-retaining ceramic"],
    hook_angle: "Cafe-grade pour-over at home",
    persona: "Warm, knowledgeable host",
    shots: [
      {
        duration: 15,
        visual: "Host lifts the kettle over the dripper",
        dialogue: "Your morning coffee just got an upgrade.",
        ambient_audio: "gentle kitchen room tone",
        on_screen_text: "Cafe-grade at home",
        outcome_nudges: ["Closer on the product"],
        nudge_note: "",
        technique: "slow push-in on the pour",
        transition_out: "cut",
        product_visible: "throughout",
      },
      {
        duration: 15,
        visual: "Close-up of the finished cup",
        dialogue: "Tap the link and brew better tomorrow.",
        ambient_audio: "soft ambience",
        on_screen_text: "Shop now",
        outcome_nudges: [],
        nudge_note: "",
        technique: "static hero shot",
        transition_out: "fade",
        product_visible: "end",
      },
    ],
  },
  subjects: [
    {
      kind: "product",
      image_url: null,
      asset_id: null,
      label: "Aurora Pour-Over Set",
      locked: true,
      source: "catalog",
    },
  ],
  beats: [],
};

function makeClient(seed: (qc: QueryClient) => void) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  seed(qc);
  return qc;
}

function render(qc: QueryClient, node: React.ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en as Record<string, unknown>}>
      <QueryClientProvider client={qc}>{node}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function save(name: string, html: string) {
  // Best-effort: dumps the rendered surface for reviewers; the assertions below
  // are the real check, so never fail the test if the evidence dir is absent.
  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const doc = `<!doctype html><meta charset="utf-8"><title>${name}</title><body style="font-family:sans-serif;padding:24px">${html}</body>`;
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${name}.html`), doc);
  } catch {
    /* evidence dir unavailable (CI/other machine) — assertions still run */
  }
}

// Modules import next/navigation at load time — import after vi.mock is set up.
let StudioPage: React.ComponentType;
let JobDetailPage: React.ComponentType;

beforeAll(async () => {
  StudioPage = (await import("@/app/app/studio/page")).default;
  JobDetailPage = (await import("@/app/app/jobs/[id]/page")).default;
});

describe("Studio page renders extracted English copy", () => {
  it("shows the config screen strings from app.studio.*", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
    });
    const html = render(qc, React.createElement(StudioPage));
    save("studio-config", html);

    const text = html.replace(/<[^>]+>/g, " ");
    for (const s of [
      "Video Studio",
      "What&#x27;s the vibe?",
      "Premium &amp; clean",
      "Make it like this",
      "vibe &amp; energy only",
      "AI Avatar",
      "Product Only",
      "Presenter",
      "AI picks a creator",
      "Manage avatars",
      "Seedance 2.0",
      "Generate video",
      "Storyboard",
    ]) {
      expect(text, `expected "${s}" in studio render`).toContain(s);
    }
    // Video-output language labels must NOT come from the UI catalog — the
    // picker still renders the raw endonyms from VIDEO_LANGUAGES.
    expect(text).toContain("Español");
    expect(text).toContain("简体中文");
  });

  it("renders the Size (aspect ratio) picker below Resolution with all five options", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
    });
    const html = render(qc, React.createElement(StudioPage));
    save("studio-size-picker", html);

    const text = html.replace(/<[^>]+>/g, " ");
    // Section heading is translated (catalog); ratio labels + platform blurbs
    // are NOT (brand names / numeric ratios — same posture as the Format row).
    expect(text).toContain("Size");
    for (const s of [
      "9:16",
      "TikTok / Reels / Shorts",
      "16:9",
      "YouTube",
      "1:1",
      "Square feed",
      "4:3",
      "RedNote",
      "3:4",
      "Xiaohongshu",
    ]) {
      expect(text, `expected size option "${s}" in studio render`).toContain(s);
    }
    // Every size stays selectable — none of the five buttons is disabled
    // (product decision: nothing greyed out in any mode).
    const sizeSection = html.slice(html.indexOf(">Size<"), html.indexOf("5 · Language"));
    expect(sizeSection).not.toContain("disabled");
    // Default mode is ai_avatar, so the talking-head shape hint shows.
    expect(text).toContain("Talking-head output may adapt its shape");
    // Positioning: the Size picker renders after the Resolution picker.
    expect(html.indexOf("Resolution")).toBeGreaterThan(-1);
    expect(html.indexOf("Size")).toBeGreaterThan(html.indexOf("Resolution"));
    // Summary Format row reflects the (default) chosen size, not a literal.
    expect(text).toContain("9:16");
  });
});

describe("Aspect-ratio picker shares the backend contract", () => {
  it("exposes exactly the agreed enum, 9:16 default first", () => {
    const values = VIDEO_ASPECT_RATIOS.map((a) => a.value);
    // Must mirror fm/video-size-be-q7 exactly: enum + order + default.
    expect(values).toEqual(["9:16", "16:9", "1:1", "4:3", "3:4"]);
    // Default the Studio state initialises with is the first / 9:16.
    expect(values[0]).toBe("9:16");
    // Every option carries a platform blurb (brand hints, not i18n'd).
    for (const a of VIDEO_ASPECT_RATIOS) expect(a.blurb.length).toBeGreaterThan(0);
  });
});

describe("Job detail page renders extracted English copy", () => {
  it("shows the storyboard-gate strings from app.jobs.*", () => {
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), { ...baseJob, status: "awaiting_storyboard" }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    save("jobs-storyboard", html);

    const text = html.replace(/<[^>]+>/g, " ");
    for (const s of [
      "My Videos",
      "Talking intro",
      "Here&#x27;s the plan for your video",
      "Approve &amp; make my video",
      "This is the only step that uses your credits.",
      "Locked in for every shot",
      "Locked",
    ]) {
      expect(text, `expected "${s}" in storyboard render`).toContain(s);
    }
  });

  it("shows the completed-view strings from app.jobs.completed.*", () => {
    const completed: VideoJob = {
      ...baseJob,
      status: "completed",
      video_url: "https://example.test/v.mp4",
      download_url: "https://example.test/v.mp4",
    };
    const qc = makeClient((c) => c.setQueryData(qk.job("job-1"), completed));
    const html = render(qc, React.createElement(JobDetailPage));
    save("jobs-completed", html);

    const text = html.replace(/<[^>]+>/g, " ");
    for (const s of [
      "Ready to publish",
      "Your video is ready",
      "Download",
      "Mark as posted",
    ]) {
      expect(text, `expected "${s}" in completed render`).toContain(s);
    }
  });

  it("shows the failed-view strings from app.jobs.failed.*", () => {
    const failed: VideoJob = {
      ...baseJob,
      status: "failed",
      error_message: null,
    };
    const qc = makeClient((c) => c.setQueryData(qk.job("job-1"), failed));
    const html = render(qc, React.createElement(JobDetailPage));
    save("jobs-failed", html);

    const text = html.replace(/<[^>]+>/g, " ");
    for (const s of [
      "Generation failed",
      "Something went wrong. Try creating it again.",
      "Retry",
      "Start a new video",
    ]) {
      expect(text, `expected "${s}" in failed render`).toContain(s);
    }
  });
});
