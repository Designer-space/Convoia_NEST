"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

// ── Theme definitions ────────────────────────────────────────
export const THEMES = [
  {
    id: "light",
    label: "Light",
    description: "Normal saturation",
    icon: "☀️",
    preview: { bg: "#F8FAFC", primary: "#3B82F6", surface: "#FFFFFF" },
  },
  {
    id: "light-saturated",
    label: "Light Vivid",
    description: "High saturation",
    icon: "✨",
    preview: { bg: "#FDF2F8", primary: "#EC4899", surface: "#FFE4E6" },
  },
  {
    id: "dark",
    label: "Dark",
    description: "Normal saturation",
    icon: "🌙",
    preview: { bg: "#0F172A", primary: "#6366F1", surface: "#1E293B" },
  },
  {
    id: "dark-neon",
    label: "Neon",
    description: "High saturation",
    icon: "⚡",
    preview: { bg: "#000000", primary: "#22D3EE", surface: "#111111" },
  },
];

const STORAGE_KEY = "convoia-theme";
const DEFAULT_THEME = "light";
const VALID_IDS = THEMES.map((t) => t.id);

// The <html data-theme> attribute is the single source of truth. The inline
// script in layout.js sets it before paint; here we just read and update it.
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function readTheme() {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const current = document.documentElement.getAttribute("data-theme");
  return VALID_IDS.includes(current) ? current : DEFAULT_THEME;
}

function getServerSnapshot() {
  return DEFAULT_THEME;
}

function applyTheme(id) {
  if (!VALID_IDS.includes(id)) return;
  document.documentElement.setAttribute("data-theme", id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage failures (private mode, quota).
  }
  emit();
}

// ── Context ──────────────────────────────────────────────────
const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Provider ─────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
