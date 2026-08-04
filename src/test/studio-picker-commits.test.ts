/**
 * Each Studio picker commits its own field and nothing else. Narrowing repairs
 * every sub-option on every render, so a shared commit path would let a click
 * on one picker persist another picker's *derived* repair - burning the user's
 * explicit 1080p pick the moment they touch a size card under a 720p mode.
 * There is no DOM harness in this project, so this is the structural form of
 * the guarantee: exactly one writer per field, and it is that field's own
 * click handler.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/app/studio/page.tsx"),
  "utf8",
);

const SETTERS = [
  "setMode",
  "setResolution",
  "setAspectRatio",
  "setVideoModel",
  "setLanguageOverride",
];

function occurrences(pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

describe("Studio picker commits", () => {
  it.each(SETTERS)("%s is written only by its own click handler", (setter) => {
    // The `useState` destructuring is a declaration, not a call.
    expect(occurrences(new RegExp(`\\b${setter}\\(`, "g"))).toBe(1);
    expect(occurrences(new RegExp(`onClick=\\{\\(\\) => ${setter}\\(`, "g"))).toBe(1);
  });
});
