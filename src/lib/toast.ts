/* Framework-free toast store. UI lives in components/ui/toaster.tsx;
   fire from anywhere (event handlers, mutation callbacks) via `toast.*`. */

export type ToastVariant = "success" | "error" | "info";

export type Toast = {
  id: number;
  variant: ToastVariant;
  message: string;
};

const DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};
const MAX_VISIBLE = 4;

let toasts: Toast[] = [];
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

function clearTimer(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
}

function dismiss(id: number) {
  clearTimer(id);
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(variant: ToastVariant, message: string, duration?: number): number {
  const id = nextId++;
  const next = [...toasts, { id, variant, message }];
  while (next.length > MAX_VISIBLE) clearTimer(next.shift()!.id);
  toasts = next;
  timers.set(
    id,
    setTimeout(() => dismiss(id), duration ?? DURATIONS[variant]),
  );
  emit();
  return id;
}

export const toast = {
  success: (message: string, duration?: number) => push("success", message, duration),
  error: (message: string, duration?: number) => push("error", message, duration),
  info: (message: string, duration?: number) => push("info", message, duration),
  dismiss,
};
