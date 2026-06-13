"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How is Lumi different from generic AI video tools?",
    a: "Lumi doesn't guess. Before it writes a single line, it studies a large sample of real, organic top-performers in your product's category and extracts the structural pattern — hook, proof, and CTA shapes that actually convert. Your script is grounded in that pattern, not a blank page.",
  },
  {
    q: "Do I need to film anything or be on camera?",
    a: "No. Choose AI Avatar mode for a presenter-led video, or Product-Only mode for clean showcase footage. Lumi generates the visuals, voice, and captions end-to-end from your product.",
  },
  {
    q: "Can I review the video before it's fully rendered?",
    a: "Yes — that's the Beat Review gate. Lumi generates a reference image for every beat (shot) first. You approve or regenerate each one, and only then does it spend render time. Prefer hands-off? Auto-QA approves beats for you.",
  },
  {
    q: "Which video model does Lumi use?",
    a: "Lumi renders with Seedance 2.0, tuning the settings per shot. More frontier video models are on the roadmap — your scripts and beats carry over when new models land.",
  },
  {
    q: "Where does the product data come from?",
    a: "Paste a link from Amazon, Shopee, TikTok Shop, or your own store — or upload your own product photos — and Lumi reads the title, description, and imagery to build from. Your products stay private to you. Prefer ideas? Browse the built-in marketplace of trending picks.",
  },
  {
    q: "How long does one video take?",
    a: "Lumi scripts, storyboards, and renders without you filming or editing — you kick it off and come back to a finished, publish-ready cut. The pattern research for a category is cached, so later videos in that category start even faster.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border rounded-card border border-border bg-card shadow-soft">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-lg font-medium text-ink">
                {item.q}
              </span>
              <Plus
                className={cn(
                  "h-5 w-5 shrink-0 text-brand-500 transition-transform duration-300",
                  isOpen && "rotate-45",
                )}
              />
            </button>
            <div
              className={cn(
                "grid overflow-hidden px-6 transition-all duration-300",
                isOpen
                  ? "grid-rows-[1fr] pb-6 opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <p className="min-h-0 text-[15px] leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
