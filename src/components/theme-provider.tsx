"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "lumi-theme";
const THEME_EVENT = "lumi-theme-change";

type Ctx = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  mq.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onChange);
  };
}

function getTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
}

function getResolved(): "light" | "dark" {
  const t = getTheme();
  const dark =
    t === "dark" ||
    (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "system" as const);
  const resolved = useSyncExternalStore(subscribe, getResolved, () => "light" as const);

  // sync the html class + saved choice (the no-flash script handles first paint)
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", resolved === "dark");
    el.dataset.theme = theme;
  }, [resolved, theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/* Inline script for the document head — sets the theme class and stamps the
   saved choice on <html data-theme> before paint. React can't paint the
   ThemeToggle's selected pill correctly on its own (the server snapshot has no
   localStorage), so globals.css reads that same attribute: one mechanism owns
   first paint for both the background and the toggle. */
export const themeNoFlashScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var el=document.documentElement;el.classList.toggle('dark',d);el.dataset.theme=t;}catch(e){}})();`;
