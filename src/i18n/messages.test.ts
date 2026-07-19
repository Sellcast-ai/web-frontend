import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";

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
      "marketplace",
      "products",
      "profile",
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
