import type { SubjectLock, SubjectKind } from "@/lib/api/types";

/** Translation key per subject kind for the plain "role" line above the label. */
export const SUBJECT_HEADING_KEYS: Record<SubjectKind, "product" | "host" | "scene"> = {
  product: "product",
  person: "host",
  scene: "scene",
};

const ORDER: SubjectKind[] = ["product", "person", "scene"];

/** Subjects to show in the lock strip, in Product → Host → Scene order.
 *  Returns [] when there are none (older jobs / before generation) so the
 *  caller omits the strip entirely rather than rendering placeholders. */
export function orderedSubjects(subjects: SubjectLock[] | undefined): SubjectLock[] {
  if (!subjects?.length) return [];
  return [...subjects].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}
