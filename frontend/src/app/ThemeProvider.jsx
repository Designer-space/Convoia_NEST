"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // On mount: read what the blocking script applied to <html data-theme>,
  // falling back to localStorage for backwards compatibility
  useEffect(() => {
    const inline = document.documentElement.getAttribute("data-theme");
    const saved = localStorage.getItem(STORAGE_KEY);
    const valid = THEMES.find((t) => t.id === (inline || saved));
    if (valid) setThemeState(valid.id);
    setMounted(true);
  }, []);

  // When theme changes: apply to <html> and save to localStorage
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = (id) => {
    const valid = THEMES.find((t) => t.id === id);
    if (valid) setThemeState(valid.id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}