/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Legacy fallbacks for compatibility with current code
        bg: {
          primary: "hsl(var(--background))",
          secondary: "hsl(var(--secondary))",
          hover: "hsl(var(--accent))",
          card: "hsl(var(--card))",
        },
        dark: {
          bg: {
            primary: "hsl(var(--background))",
            secondary: "hsl(var(--secondary))",
            hover: "hsl(var(--accent))",
            card: "hsl(var(--card))",
          }
        },
        ink: {
          DEFAULT: "hsl(var(--foreground))",
          secondary: "hsl(var(--muted-foreground))",
          disabled: "hsl(var(--muted-foreground))",
          muted: "hsl(var(--muted-foreground))",
        },
        "ink-dark": {
          DEFAULT: "hsl(var(--foreground))",
          secondary: "hsl(var(--muted-foreground))",
          disabled: "hsl(var(--muted-foreground))",
          muted: "hsl(var(--muted-foreground))",
        },
        "border-dark": {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border))",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "var(--radius)",
        widget: "var(--radius)",
      },
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
      gridTemplateColumns: {
        dashboard: "repeat(12, minmax(0, 1fr))",
      },
      boxShadow: {
        card: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.10)",
        "card-dark": "0 4px 6px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.30)",
        "card-hover": "0 8px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.08)",
        "card-hover-dark": "0 8px 16px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.30)",
        popup: "0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
