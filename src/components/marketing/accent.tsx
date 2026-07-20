/**
 * Renders one phrase of a marketing heading in the italic-serif accent voice
 * (Instrument Serif) — the arcads "Redaction" pattern: exactly one accented
 * phrase per major heading. Marketing-scoped; `--font-accent` (and the
 * `.font-accent` utility it drives) is only defined under `.marketing`.
 */
export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="font-accent">{children}</span>;
}
