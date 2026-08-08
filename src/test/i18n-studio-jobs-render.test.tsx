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
import { StatusBadge } from "@/components/app/status-badge";
import { VIDEO_ASPECT_RATIOS } from "@/lib/api/types";
import type { ProductSummary, Usage, VideoJob } from "@/lib/api/types";

// The pages call these; none are exercised for a static render.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("product=prod-1"),
  useParams: () => ({ id: "job-1" }),
}));

const EVIDENCE_DIR =
  process.env.EVIDENCE_DIR ??
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

/** The markup of one `data-testid` element, so a negative assertion fails on
 *  the region under test rather than on any other section of the page (React
 *  self-closes void elements, so tag depth is countable). */
function region(html: string, testId: string): string {
  const marker = html.indexOf(`data-testid="${testId}"`);
  if (marker < 0) throw new Error(`no [data-testid="${testId}"] in render`);
  const start = html.lastIndexOf("<", marker);
  const tags = /<(\/?)[a-zA-Z][^\s/>]*([^>]*)>/g;
  tags.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    depth += match[1] ? -1 : match[2].endsWith("/") ? 0 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  throw new Error(`unbalanced markup for [data-testid="${testId}"]`);
}

const regionText = (html: string, testId: string) =>
  region(html, testId).replace(/<[^>]+>/g, " ");

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

// Rendering these two pages blows past the 5s default on a cold cache; scoped
// to this file so a genuinely hung test elsewhere still fails in 5s.
vi.setConfig({ testTimeout: 20_000 });

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
      // screen readers must be told which line is spoken and which is seen -
      // the icons alone say nothing, and quote marks are not a dialogue
      // convention in every locale we ship
      "Spoken line",
      "Visual direction",
      "Locked in for every shot",
      "Locked",
    ]) {
      expect(text, `expected "${s}" in storyboard render`).toContain(s);
    }
  });

  it("shows dialogue verbatim and degrades missing visual context cleanly", () => {
    // legacy payloads predate these fields, so they arrive missing, not empty
    const storyboard = {
      ...baseJob.storyboard!,
      audience: undefined,
      hook_angle: undefined,
      shots: [
        {
          ...baseJob.storyboard!.shots[0],
          visual: undefined,
          dialogue: "(smiling) Try it now (today only).",
        },
      ],
    } as unknown as NonNullable<VideoJob["storyboard"]>;

    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), {
        ...baseJob,
        status: "awaiting_storyboard",
        storyboard,
      }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    save("jobs-storyboard-legacy", html);
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("No visual direction");
    // verbatim: the approval screen must match what PATCH/render/TTS consume
    expect(text).toContain("(smiling) Try it now (today only).");
    expect(text).not.toContain("Angle");
    expect(text).not.toContain("Audience");
  });

  it("drops unknown storyboard nudges instead of rendering translation keys", () => {
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), {
        ...baseJob,
        status: "awaiting_storyboard",
        storyboard: {
          ...baseJob.storyboard!,
          shots: [
            {
              ...baseJob.storyboard!.shots[0]!,
              outcome_nudges: [
                "Closer on the product",
                "Boosts gaming immersion",
                "Enhances online meetings",
              ],
            },
          ],
        },
      }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    save("jobs-storyboard-unknown-nudges", html);
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Closer on the product");
    expect(text).not.toContain("Boosts gaming immersion");
    expect(text).not.toContain("Enhances online meetings");
    expect(text).not.toContain("app.jobs.shotEditor.nudgeLabels");
    expect(text).toContain("Approve &amp; make my video");
  });

  it("shows one truthful story after storyboard approval while shots are queued", () => {
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), {
        ...baseJob,
        status: "queued",
        beats: [],
      }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    save("jobs-post-approval-wait", html);

    const text = html.replace(/<[^>]+>/g, " ");
    for (const s of [
      "Queued for shots",
      "Script",
      "Review",
      "Shots",
      "Render",
      "Ready",
      "Waiting to build your shots",
      "Your storyboard is approved.",
      "in line to have its shot references",
      "You can leave and come back.",
    ]) {
      expect(text, `expected "${s}" in post-approval render`).toContain(s);
    }
    expect(text).not.toContain("Writing your script");
    expect(text).not.toContain("Queued for script");
    // A queued job is parked in line, so nothing may claim work is happening.
    expect(text).not.toContain("preparing the shot references");
    // No credit claim may ride along after approval, where it is false - read
    // from the waiting card alone, since other sections may say "credits".
    expect(regionText(html, "job-working")).not.toContain("credits");
  });

  it("says work is under way once a worker has claimed the job", () => {
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), { ...baseJob, status: "submitted", beats: [] }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    const text = html.replace(/<[^>]+>/g, " ");

    expect(text).toContain("Building your shots");
    expect(text).toContain("preparing the shot references");
    expect(text).toContain("You can leave and come back.");
    // Bare enough a substring that it only means anything inside the wait copy.
    expect(regionText(html, "job-working")).not.toContain("in line");
  });

  // Legacy per-beat gate: Studio hardcodes review_mode false, so only jobs
  // created before it can sit here. The tracker puts them on Shots, so the
  // badge and the body have to read as reviewing shots too.
  it("reads as reviewing shots on all three surfaces at the shot gate", () => {
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), { ...baseJob, status: "awaiting_review" }),
    );
    const html = render(qc, React.createElement(JobDetailPage));
    const tracker = region(html, "job-progress");
    const text = html.replace(/<[^>]+>/g, " ");

    // The current step is the one drawn with the brand-gradient badge; a done
    // step renders a checkmark rather than its number.
    const current = tracker.slice(tracker.indexOf(">", tracker.indexOf("bg-brand-gradient")));
    expect(current.replace(/<[^>]+>/g, " ")).toMatch(/^>\s*3\s+Shots/);
    expect(text).toContain("Review shots");
    expect(text).toContain("Review your shots");
  });

  it("wraps every tracker label at 320px instead of scrolling the current step away", () => {
    const qc = makeClient((c) =>
      c.setQueryData(qk.job("job-1"), { ...baseJob, status: "queued", beats: [] }),
    );
    const tracker = region(render(qc, React.createElement(JobDetailPage)), "job-progress");

    // The row wraps rather than scrolling: every step - including the current
    // one - stays on screen at 320px, and the badges keep their circle.
    expect(tracker).toContain("flex flex-wrap items-center gap-x-5 gap-y-2 sm:flex-nowrap");
    // A wrapped row must group by step: the gap between two steps is wider
    // than the one between a badge and its own label.
    expect(tracker).toMatch(/flex items-center gap-2 sm:flex-1/);
    expect(tracker).not.toContain("overflow-x-auto");
    expect(tracker).toMatch(/h-7 w-7 shrink-0/);
    expect(tracker).toMatch(/block whitespace-nowrap text-xs/);
    expect(tracker).not.toMatch(/hidden text-xs font-semibold sm:block/);
    // The connector lines are the only part that goes away when wrapped.
    expect(tracker).toMatch(/relative hidden h-0\.5 flex-1[^"]*sm:block/);
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

describe("StatusBadge keeps one story across the two surfaces it renders on", () => {
  const badgeText = (job: VideoJob, compact?: boolean) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en as Record<string, unknown>}>
        <StatusBadge job={job} compact={compact} />
      </NextIntlClientProvider>,
    )
      .replace(/<[^>]+>/g, "")
      .trim();

  const approved = [
    { ...baseJob.beats[0], review_status: "user_approved" },
  ] as unknown as VideoJob["beats"];

  it("shrinks a claimed worker stage to its tracker step label on the grid", () => {
    const cases: Array<[VideoJob, string, string]> = [
      [{ ...baseJob, status: "queued", storyboard: null }, "Queued for script", "Queued"],
      [{ ...baseJob, status: "submitted", beats: [] }, "Building shots", "Shots"],
      [{ ...baseJob, status: "queued", beats: approved }, "Queued for render", "Queued"],
      [{ ...baseJob, status: "in_progress", beats: approved }, "Rendering", "Render"],
    ];
    for (const [job, full, short] of cases) {
      expect(badgeText(job)).toBe(full);
      expect(badgeText(job, true)).toBe(short);
      // The compact label is the tracker's own, so the tile can never name a
      // stage the job page's tracker disagrees with.
      expect(short.length).toBeLessThanOrEqual(full.length);
    }
  });

  // Colour and a pulsing dot are not text, so a screen reader would hear the
  // same word for a job parked in line and one a worker is actively running.
  it("keeps waiting and working apart in words, not just colour", () => {
    for (const beats of [[] as VideoJob["beats"], approved]) {
      const waiting = badgeText({ ...baseJob, status: "queued", beats }, true);
      const working = badgeText({ ...baseJob, status: "in_progress", beats }, true);
      expect(waiting).toBe("Queued");
      expect(working).not.toBe(waiting);
    }
  });

  it("never shortens away a state that names itself", () => {
    for (const job of [
      { ...baseJob, status: "completed" as const },
      { ...baseJob, status: "failed" as const },
      { ...baseJob, status: "awaiting_storyboard" as const },
      { ...baseJob, status: "awaiting_review" as const },
    ]) {
      expect(badgeText(job, true)).toBe(badgeText(job));
    }
    expect(badgeText({ ...baseJob, status: "completed" }, true)).toBe("Ready");
    expect(badgeText({ ...baseJob, status: "failed" }, true)).toBe("Failed");
  });
});
