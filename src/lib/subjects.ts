import type { SubjectLock, SubjectKind } from "@/lib/api/types";

/** Card heading per subject kind — the plain "role" line above the label. */
export const SUBJECT_HEADING: Record<SubjectKind, string> = {
  product: "Product",
  person: "Host",
  scene: "Scene",
};

const ORDER: SubjectKind[] = ["product", "person", "scene"];

/** Subjects to show in the lock strip, in Product → Host → Scene order.
 *  Returns [] when there are none (older jobs / before generation) so the
 *  caller omits the strip entirely rather than rendering placeholders. */
export function orderedSubjects(subjects: SubjectLock[] | undefined): SubjectLock[] {
  if (!subjects?.length) return [];
  return [...subjects].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}
