const STAGE_DIRECTION_RE =
  /\b(?:beat|camera|cheerful(?:ly)?|chuckle(?:s|d|ing)?|confident(?:ly)?|dramatic(?:ally)?|excited(?:ly)?|friendly|gesture(?:s|d|ing)?|hold(?:s|ing)?|laugh(?:s|ed|ing)?|lean(?:s|ed|ing)?|look(?:s|ed|ing)?|nod(?:s|ded|ding)?|pause(?:s|d|ing)?|point(?:s|ed|ing)?|shrug(?:s|ged|ging)?|sigh(?:s|ed|ing)?|smil(?:e|es|ed|ing)|softly|upbeat|voiceover|whisper(?:s|ed|ing)?|v\.o\.|o\.s\.)\b/i;

/** Remove AI stage-direction parentheticals from seller-facing spoken copy. */
export function stripDialogueStageDirections(dialogue: string): string {
  return dialogue
    .replace(/\s*\(([^()]*)\)\s*/g, (match, inner: string, offset: number, full: string) => {
      const note = inner.trim();
      if (!note || !STAGE_DIRECTION_RE.test(note)) return match;

      const before = full.slice(0, offset).trimEnd();
      const after = full.slice(offset + match.length).trimStart();
      if (!before || !after) return " ";
      if (/^[,.;:!?]/.test(after)) return "";
      return " ";
    })
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
