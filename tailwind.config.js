/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Use media queries for dark mode to automatically follow system preference
  darkMode: "media",

  theme: {
    extend: {
      // ─── Color Design Tokens ─────────────────────────────────────────────
      colors: {
        // Background layers
        bg: {
          primary:   "#ffffff",           // page background
          secondary: "#f7f6f3",           // sidebar / section tint
          hover:     "rgba(55,53,47,0.08)",
          card:      "#ffffff",
        },
        dark: {
          bg: {
            primary:   "#202124",
            secondary: "#202020",
            hover:     "rgba(255,255,255,0.08)",
            card:      "#202020",
          },
        },

        // Text
        ink: {
          DEFAULT:   "#37352f",           // primary text
          secondary: "rgba(55,53,47,0.65)",
          disabled:  "rgba(55,53,47,0.35)",
        },
        "ink-dark": {
          DEFAULT:   "#ffffff",
          secondary: "rgba(255,255,255,0.65)",
          disabled:  "rgba(255,255,255,0.35)",
        },

        // Borders / Dividers
        border: {
          DEFAULT: "rgba(55,53,47,0.16)",
          strong:  "rgba(55,53,47,0.35)",
        },
        "border-dark": {
          DEFAULT: "rgba(255,255,255,0.16)",
          strong:  "rgba(255,255,255,0.35)",
        },

        // Accent / Brand
        accent: {
          DEFAULT: "#2eaadc",
          hover:   "#1f82aa",
          light:   "#e8f4fb",
          success: "#2e7d32",
          danger:  "#e03e3e",
        },

        // Notion palette shades (for badges, tags, etc.)
        notion: {
          gray:   "#9b9a97",
          brown:  "#64473a",
          orange: "#d9730d",
          yellow: "#dfab01",
          green:  "#0f7b6c",
          blue:   "#0b6e99",
          purple: "#6940a5",
          pink:   "#ad1a72",
          red:    "#e03e3e",
        },
      },

      // ─── Typography ──────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Helvetica",
          '"Apple Color Emoji"',
          "Arial",
          "sans-serif",
        ],
      },

      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
      },

      // ─── Border Radius ────────────────────────────────────────────────────
      borderRadius: {
        card:   "12px",
        widget: "16px",
        badge:  "4px",
      },

      // ─── Box Shadows ──────────────────────────────────────────────────────
      boxShadow: {
        card:   "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.10)",
        "card-dark": "0 4px 6px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.30)",
        "card-hover": "0 8px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.08)",
        "card-hover-dark": "0 8px 16px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.30)",
        popup:  "0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12)",
      },

      // ─── Transitions ─────────────────────────────────────────────────────
      transitionDuration: {
        fast:   "120ms",
        normal: "200ms",
        slow:   "350ms",
      },

      // ─── Spacing extras ──────────────────────────────────────────────────
      spacing: {
        4.5: "1.125rem",
        13:  "3.25rem",
        15:  "3.75rem",
        18:  "4.5rem",
      },

      // ─── Grid ────────────────────────────────────────────────────────────
      gridTemplateColumns: {
        dashboard: "repeat(12, minmax(0, 1fr))",
      },
    },
  },

  plugins: [],
};
