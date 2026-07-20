import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import id from "../../messages/id.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import pt from "../../messages/pt.json";
import th from "../../messages/th.json";
import vi from "../../messages/vi.json";
import zh from "../../messages/zh.json";

const catalogs = { en, es, zh, ja, ko, pt, id, vi, th };
const nonEnglishLocales = ["es", "zh", "ja", "ko", "pt", "id", "vi", "th"] as const;

function flattenMessages(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (typeof value === "string") {
    out[prefix] = value;
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenMessages(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flattenMessages(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out[prefix] = String(value);
  return out;
}

function placeholderSignature(message: string) {
  return {
    tags: Array.from(message.matchAll(/<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>/g))
      .map((match) => match[0])
      .sort(),
    variables: Array.from(
      message.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*([A-Za-z]+))?/g),
    )
      .map((match) => `${match[1]}:${match[2] ?? ""}`)
      .sort(),
  };
}

// The proof-surface nav labels (SiteHeader + AppShell) resolve from these keys.
// A missing key makes next-intl throw at render, so guard them explicitly.
describe("en catalog", () => {
  it("has the marketing nav keys used by SiteHeader", () => {
    expect(Object.keys(en.nav).sort()).toEqual([
      "features",
      "howItWorks",
      "models",
      "pricing",
    ]);
  });

  it("has the app nav keys used by AppShell", () => {
    expect(Object.keys(en.app.nav).sort()).toEqual([
      "avatars",
      "logOut",
      "marketplace",
      "new",
      "newVideo",
      "products",
      "profile",
      "signedIn",
      "videos",
    ]);
  });

  it("has the shared status keys used by StatusBadge", () => {
    expect(Object.keys(en.shared.status).sort()).toEqual([
      "failed",
      "needsReview",
      "queued",
      "ready",
      "rendering",
      "reviewStoryboard",
      "submitted",
    ]);
  });

  it("has shared enum label keys used by job progress and subject strips", () => {
    expect(Object.keys(en.shared.jobProgress).sort()).toEqual([
      "beats",
      "ready",
      "render",
      "review",
      "script",
    ]);
    expect(Object.keys(en.shared.subjects).sort()).toEqual([
      "host",
      "product",
      "scene",
    ]);
  });

  it("has the legal keys used by the terms/privacy/refunds pages", () => {
    expect(Object.keys(en.marketing.legal).sort()).toEqual([
      "kicker",
      "lastUpdated",
      "privacy",
      "refunds",
      "terms",
    ]);
    // Rich-text segments carry ICU tags that must survive translation.
    expect(en.marketing.legal.terms.billing.body).toContain("<refunds>");
    expect(en.marketing.legal.terms.contact.body).toContain("<email>");
    expect(en.marketing.legal.privacy.collect.account).toContain("<strong>");
    expect(en.marketing.legal.refunds.request.body).toContain("<email>");
  });

  it("has the auth keys used by auth pages and AuthForm", () => {
    expect(Object.keys(en.auth.layout).sort()).toEqual([
      "benefitPublish",
      "benefitReview",
      "benefitScripts",
      "heroTitle",
    ]);
    expect(Object.keys(en.auth.metadata).sort()).toEqual([
      "createAccount",
      "signIn",
    ]);
    expect(Object.keys(en.auth.form).sort()).toEqual([
      "alreadyHaveAccount",
      "codePlaceholder",
      "continue",
      "continueWithGoogle",
      "createAccountLink",
      "devCodeAutofilled",
      "googleDisabledTitle",
      "googleSignInFailed",
      "invalidPhone",
      "loginSubtitle",
      "loginTitle",
      "newToLumi",
      "phoneLabel",
      "sendCode",
      "sendCodeFailed",
      "separator",
      "signInLink",
      "signupSubtitle",
      "signupTitle",
      "verificationCodeLabel",
      "verifyCodeFailed",
    ]);
  });
});

describe("locale catalogs", () => {
  const sourceMessages = flattenMessages(catalogs.en);
  const sourceKeys = Object.keys(sourceMessages).sort();

  it("has every target locale catalog", () => {
    expect(Object.keys(catalogs).sort()).toEqual([
      "en",
      "es",
      "id",
      "ja",
      "ko",
      "pt",
      "th",
      "vi",
      "zh",
    ]);
  });

  it("keeps every non-English catalog structurally identical to en", () => {
    for (const locale of nonEnglishLocales) {
      expect(Object.keys(flattenMessages(catalogs[locale])).sort()).toEqual(sourceKeys);
    }
  });

  it("preserves ICU placeholders and rich-text tags across locales", () => {
    for (const locale of nonEnglishLocales) {
      const messages = flattenMessages(catalogs[locale]);
      for (const key of sourceKeys) {
        expect(placeholderSignature(messages[key]), `${locale}.${key}`).toEqual(
          placeholderSignature(sourceMessages[key]),
        );
      }
    }
  });

  it("resolves representative marketing, app, rich-text, and plural messages", () => {
    for (const locale of nonEnglishLocales) {
      const t = createTranslator({ locale, messages: catalogs[locale] });

      expect(t("nav.features"), locale).not.toBe(sourceMessages["nav.features"]);
      expect(t("app.nav.products"), locale).not.toBe(sourceMessages["app.nav.products"]);
      expect(t("app.toasts.importSucceeded", { count: 1 }), locale).toContain("1");
      expect(t("app.toasts.importSucceeded", { count: 2 }), locale).toContain("2");
      expect(
        t.rich("marketing.landing.heroTitle", {
          highlight: (chunks) => `[${chunks}]`,
        }),
        locale,
      ).toContain("[");
    }
  });
});
