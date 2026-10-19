import { Moon, Sparkles, Sun, Zap } from "lucide-react";

/**
 * Theme descriptor `icon` key → lucide component. The emoji that used to live
 * in ThemeProvider were the only place the app used pictures as text; these
 * inherit `currentColor` and stay legible on every surface.
 */
export const THEME_ICONS = {
  sun: Sun,
  sparkles: Sparkles,
  moon: Moon,
  zap: Zap,
};

/** Fallback for a theme whose `icon` key is unknown. */
export const FALLBACK_THEME_ICON = Sun;
