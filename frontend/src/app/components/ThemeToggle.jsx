"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTheme } from "../ThemeProvider";
import { FALLBACK_THEME_ICON, THEME_ICONS } from "./themeIcons";

/**
 * Theme control: a compact icon button that sits in the sidebar header (and the
 * mobile top bar) and opens a radiogroup of the four themes. Each option shows a
 * live miniature of that theme — rendered with `data-theme`, so the preview is
 * the theme itself rather than a hard-coded swatch.
 */
export default function ThemeToggle({ side = "right" }) {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const optionRefs = useRef([]);
  const panelId = useId();

  const current = themes.find((t) => t.id === theme) ?? themes[0];
  const TriggerIcon = THEME_ICONS[current.icon] ?? FALLBACK_THEME_ICON;

  const close = ({ focusTrigger = false } = {}) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  // Esc closes and hands focus back to the button; a pointer outside closes too.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close({ focusTrigger: true });
      }
    };
    const onPointerDown = (event) => {
      if (
        !panelRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Opening moves focus to the active option, where the radio pattern expects a
  // keyboard user to land.
  useEffect(() => {
    if (!open) return;
    const index = Math.max(
      0,
      themes.findIndex((t) => t.id === theme),
    );
    optionRefs.current[index]?.focus();
  }, [open, theme, themes]);

  const onOptionKeyDown = (event, index) => {
    const last = themes.length - 1;
    let next;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    setTheme(themes[next].id); // a radio group selects as it moves
    optionRefs.current[next]?.focus();
  };

  // Close when focus leaves the popover entirely (tabbing out).
  const onPanelBlur = (event) => {
    const to = event.relatedTarget;
    if (!panelRef.current?.contains(to) && to !== triggerRef.current) close();
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Theme: ${current.label}. Choose a theme`}
        title={`Theme: ${current.label}`}
        className="flex h-9 items-center gap-1 rounded-lg border border-t-border bg-t-surface px-2 text-foreground transition-colors hover:bg-t-hover"
      >
        <TriggerIcon size={17} aria-hidden="true" />
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`text-t-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="radiogroup"
          aria-label="Theme"
          onBlur={onPanelBlur}
          className={`absolute top-full z-40 mt-2 w-52 rounded-xl border border-t-border bg-t-surface p-1.5 shadow-t-float ${
            side === "right" ? "right-0" : "left-0"
          }`}
        >
          {themes.map((option, index) => {
            const active = option.id === theme;
            const Icon = THEME_ICONS[option.icon] ?? FALLBACK_THEME_ICON;
            return (
              <button
                key={option.id}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => {
                  setTheme(option.id);
                  close({ focusTrigger: true });
                }}
                onKeyDown={(event) => onOptionKeyDown(event, index)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-t-hover ${
                  active ? "bg-t-hover" : ""
                }`}
              >
                {/* Live miniature: these utilities resolve against the theme
                    named on this element, not the one currently active. */}
                <span
                  data-theme={option.id}
                  aria-hidden="true"
                  className="flex h-7 w-9 shrink-0 items-center justify-center gap-1 rounded-md border border-t-border bg-background"
                >
                  <span className="h-3.5 w-1.5 rounded-sm bg-t-primary" />
                  <span className="h-3.5 w-2.5 rounded-sm bg-t-bubble-out" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <Icon size={13} className="text-t-muted" aria-hidden="true" />
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {option.label}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-t-muted">
                    {option.description}
                  </span>
                </span>

                <Check
                  size={15}
                  aria-hidden="true"
                  className={active ? "shrink-0 text-t-primary" : "shrink-0 opacity-0"}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
