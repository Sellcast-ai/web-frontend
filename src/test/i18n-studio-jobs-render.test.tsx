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
  plan: "creator",
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

// Scoped readers, so an assertion about the pickers fails on the pickers rather
// than on any future `title`/heading anywhere else on the page.
function disabledControls(html: string): string[] {
  return (html.match(/<button[^>]*>/g) ?? []).filter((tag) => /\bdisabled\b/.test(tag));
}

function tagText(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "g"))].map(
    (match) => match[1],
  );
}

const sectionHeadings = (html: string) => tagText(html, "h2");
const summaryLabels = (html: string) => tagText(html, "dt");

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

// Transforming these two pages costs seconds, and it competes with the rest of
// the suite for cores, so the default 10s hook timeout is a coin flip on a busy
// machine (it passes isolated, fails in a full run).
beforeAll(async () => {
  StudioPage = (await import("@/app/app/studio/page")).default;
  JobDetailPage = (await import("@/app/app/jobs/[id]/page")).default;
}, 60_000);

describe("Studio page renders extracted English copy", () => {
  it("shows the config screen strings from app.studio.*", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
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
    // Default mode is product_only (avatar renders are not shipping), so the
    // presenter picker stays collapsed until the user selects AI Avatar.
    expect(text).not.toContain("Manage avatars");
  });

  // The presenter section only renders under the ai_avatar mode, which this
  // static harness can't select, so assert its keys resolve in the catalog.
  it("keeps the presenter section keys in the en catalog", () => {
    expect(en.app.studio.sections.presenter).toBeTruthy();
    expect(Object.keys(en.app.studio.presenter).sort()).toEqual([
      "auto",
      "autoSublabel",
      "manageAvatars",
    ]);
  });

  it("renders the Size (aspect ratio) picker below Resolution with all five options", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
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
    // No capability data is seeded here, so the fallback keeps every size
    // selectable — none of the five buttons is disabled.
    const sizeSection = html.slice(html.indexOf(">Size<"), html.indexOf("5 · Language"));
    expect(sizeSection).not.toContain("disabled");
    // Default mode is product_only, so the talking-head shape hint stays hidden.
    expect(text).not.toContain("Talking-head output may adapt its shape");
    // Positioning: the Size picker renders after the Resolution picker.
    expect(html.indexOf("Resolution")).toBeGreaterThan(-1);
    expect(html.indexOf("Size")).toBeGreaterThan(html.indexOf("Resolution"));
    // Summary Format row reflects the (default) chosen size, not a literal.
    expect(text).toContain("9:16");
  });

  // A mode whose offered models Studio can't label has no model to show and
  // none to send: the picker and the summary row both go, so the create payload
  // has nothing to read (`repaired.videoModel` is null, see
  // video-capabilities.test.ts) and the backend applies its own default.
  it("drops the model picker and summary row when no offered model is labelled", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
      c.setQueryData(qk.videoCapabilities, [
        {
          mode: "product_only",
          available: true,
          aspect_ratios: ["9:16", "16:9"],
          languages: null,
          beat_durations: [5, 10],
          max_resolution: "1080p",
          models: [
            {
              key: "veo-9",
              label: "Veo 9",
              model_id: "veo-9",
              max_resolution: "1080p",
              beat_durations: [5, 10],
            },
          ],
        },
      ]);
    });
    const html = render(qc, React.createElement(StudioPage));
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).not.toContain("Newest · up to 1080p");
    expect(text).not.toContain("Veo 9");
    // Neither the picker's own section nor the summary row it feeds.
    expect(sectionHeadings(html)).not.toContain("Model");
    expect(summaryLabels(html)).not.toContain("Model");
    // Generate stays usable — an unknown model list is not a dead end.
    expect(text).toContain("Generate video");
  });

  // A `title` on a disabled control never opens, so the reason has to be in the
  // option itself for it to reach anyone at all.
  it("spells out why a narrowed option is unpickable, without a dead tooltip", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
      c.setQueryData(qk.videoCapabilities, [
        {
          mode: "product_only",
          available: true,
          aspect_ratios: ["9:16", "16:9"],
          languages: ["en"],
          beat_durations: [5, 10],
          max_resolution: "720p",
          models: [
            {
              key: "seedance-2.0",
              label: "Seedance 2.0",
              model_id: "doubao-seedance-2-0-260128",
              max_resolution: "720p",
              beat_durations: [5, 10],
            },
          ],
        },
      ]);
    });
    const html = render(qc, React.createElement(StudioPage));
    const text = html.replace(/<[^>]+>/g, " ");

    // 4:3, 1080p and Spanish are all narrowed away by this payload.
    const disabled = disabledControls(html);
    expect(disabled.length).toBeGreaterThan(0);
    expect(text).toContain("Not available with this mode");
    expect(disabled.filter((tag) => tag.includes("title="))).toEqual([]);
    // Fast is unbuilt inventory, so it is not in the picker at all — a payload
    // landing must not grow a card that wasn't there before it did.
    expect(text).not.toContain("Seedance 2.0 Fast");
    // Language chips carry only a two-character badge, so the row itself has to
    // spell that badge out — sr-only text a sighted keyboard user never sees is
    // not an explanation. Only the badges actually in play are named.
    const languageRow = html.slice(html.indexOf("Español"));
    expect(languageRow).toContain("n/a: Not available with this mode");
    expect(languageRow).not.toContain("soon: Coming soon");
  });

  // The mode is the one selection Studio never makes for the user: an off mode
  // is shown as off and blocks Generate, and only their own click leaves it.
  it("blocks an unavailable mode instead of moving the user off it", () => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
      c.setQueryData(qk.videoCapabilities, [
        {
          mode: "product_only",
          available: false,
          aspect_ratios: ["9:16"],
          languages: ["en"],
          beat_durations: [5, 10],
          max_resolution: "720p",
          models: [],
        },
        {
          mode: "ai_avatar",
          available: true,
          aspect_ratios: ["9:16"],
          languages: ["en"],
          beat_durations: [5, 10],
          max_resolution: "720p",
          models: [
            {
              key: "seedance-2.0",
              label: "Seedance 2.0",
              model_id: "doubao-seedance-2-0-260128",
              max_resolution: "720p",
              beat_durations: [5, 10],
            },
          ],
        },
      ]);
    });
    const html = render(qc, React.createElement(StudioPage));
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Temporarily unavailable");
    // Still on Product Only: no presenter section, and nothing to generate.
    expect(sectionHeadings(html)).not.toContain("Presenter");
    const generateButton = html.slice(
      html.lastIndexOf("<button", html.indexOf("Generate video")),
    );
    expect(generateButton).toContain("disabled");
    // The reason sits beside the dead button too, like every other blocked
    // Generate state - the mode card is sections away on a phone.
    expect(text).toContain("Product Only isn’t available right now.");
    // ...and the blocked card still reads as the user's own selection, as do
    // the sub-pickers it takes down with it: a seller must not lose sight of
    // what they picked just because the mode above it went off.
    for (const label of ["Product Only", "720p", "9:16", "English"]) {
      const card = html.slice(
        html.lastIndexOf("<button", html.indexOf(label)),
        html.indexOf(label),
      );
      expect(card).toContain("border-brand-400");
      expect(card).toContain("disabled");
    }
  });

  // With every mode reported off there is no other mode to pick, so the note
  // may not instruct an action the grid makes impossible.
  it("names the outage instead of pointing at a mode nobody can pick", () => {
    const off = (mode: string) => ({
      mode,
      available: false,
      aspect_ratios: ["9:16"],
      languages: ["en"],
      beat_durations: [5, 10],
      max_resolution: "720p",
      models: [],
    });
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      c.setQueryData(["usage"], usage);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
      c.setQueryData(qk.videoCapabilities, [off("product_only"), off("ai_avatar")]);
    });
    const html = render(qc, React.createElement(StudioPage));
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("No render modes are available right now.");
    expect(text).not.toContain("Pick another mode to generate");
    const generateButton = html.slice(
      html.lastIndexOf("<button", html.indexOf("Generate video")),
    );
    expect(generateButton).toContain("disabled");
  });

  // The out-of-quota notice is backend-metered only: a drained meter says so
  // before the click, a funded one stays quiet, and no usage read means no
  // invented balance (the create toast carries that failure alone).
  it.each([
    { label: "drained meter", usage: { ...usage, used: 300, remaining: 0 }, shown: true },
    { label: "funded meter", usage, shown: false },
    { label: "no usage read", usage: undefined, shown: false },
  ])("$label: out-of-quota notice shown=$shown", ({ usage: seeded, shown }) => {
    const qc = makeClient((c) => {
      c.setQueryData(qk.product("prod-1"), product);
      if (seeded) c.setQueryData(["usage"], seeded);
      c.setQueryData(["avatars"], []);
      c.setQueryData(qk.jobs({}), []);
    });
    const text = render(qc, React.createElement(StudioPage)).replace(/<[^>]+>/g, " ");
    expect(text.includes("Not enough credits for this video")).toBe(shown);
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
      "Angle",
      "Cafe-grade pour-over at home",
      "Audience",
      "Home baristas",
      "Host lifts the kettle over the dripper",
      "Close-up of the finished cup",
      "Locked in for every shot",
      "Locked",
    ]) {
      expect(text, `expected "${s}" in storyboard render`).toContain(s);
    }
  });

  it("cleans storyboard dialogue and degrades missing visual context cleanly", () => {
    const storyboard = {
      ...baseJob.storyboard!,
      audience: "",
      hook_angle: "   ",
      shots: [
        {
          ...baseJob.storyboard!.shots[0],
          visual: "   ",
          dialogue: "(smiling) Try it now (today only).",
        },
      ],
    };
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), {
        ...baseJob,
        status: "awaiting_storyboard",
        storyboard,
      }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("No visual direction");
    expect(text).toContain("Try it now (today only).");
    expect(text).not.toContain("(smiling)");
    expect(text).not.toContain("Angle");
    expect(text).not.toContain("Audience");
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
