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
        navy: "#0B3B78",
        primary: "#2563EB",
        page: "#F5F7FB",
        line: "#E4E7EC",
        ink: "#172033",
        muted: "#667085",
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
      },
      boxShadow: {
        panel: "0 3px 8px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
