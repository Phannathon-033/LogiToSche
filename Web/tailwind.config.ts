import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Consolas", "monospace"],
      },
      colors: {
        navy: "#0F172A",
        "navy-light": "#1E293B",
        primary: "#0284C7",
        cyber: "#06B6D4",
        page: "#F8FAFC",
        line: "#E2E8F0",
        ink: "#0F172A",
        muted: "#64748B",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      boxShadow: {
        panel: "0 3px 8px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
