"use client";

import { useState } from "react";
import { useTheme } from "../ThemeProvider";


/**
 * ThemeToggle — drop this component anywhere in your app.
 *
 * Usage:
 *   import ThemeToggle from "@/app/components/ThemeToggle";
 *   <ThemeToggle />
 *
 * It renders a pill button that opens a floating panel
 * with all 4 theme options to pick from.
 */
export default function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);

  const current = themes.find((t) => t.id === theme);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "999px",
          border: "1.5px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "var(--shadow)",
          transition: "all 0.2s",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "16px" }}>{current?.icon}</span>
        <span>{current?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            opacity: 0.6,
          }}
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 50,
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "16px",
              padding: "12px",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
              width: "220px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              animation: "themeDropIn 0.18s ease",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                paddingLeft: "8px",
                marginBottom: "4px",
              }}
            >
              Choose Theme
            </p>

            {themes.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: isActive
                      ? "1.5px solid var(--color-primary)"
                      : "1.5px solid transparent",
                    background: isActive
                      ? `${t.preview.primary}18`
                      : "transparent",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--color-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Color preview dots */}
                  <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "6px",
                        background: t.preview.bg,
                        border: "1px solid rgba(0,0,0,0.12)",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        width: "10px",
                        height: "22px",
                        borderRadius: "4px",
                        background: t.preview.primary,
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {/* Label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        margin: 0,
                      }}
                    >
                      {t.icon} {t.label}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                        margin: 0,
                      }}
                    >
                      {t.description}
                    </p>
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="8" cy="8" r="8" fill="var(--color-primary)" />
                      <path
                        d="M5 8L7 10L11 6"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes themeDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}