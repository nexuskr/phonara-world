import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Phonara — Cyber Luxury Empire palette
        neon: {
          gold: "#E8B923",
          cyan: "#22E0FF",
          purple: "#8B5CF6",
        },
        gold: {
          DEFAULT: "hsl(var(--primary))",
          light: "hsl(var(--primary-glow))",
          dark: "#A87E18",
          foreground: "hsl(var(--primary-foreground))",
        },

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        glass: {
          DEFAULT: "rgba(12, 10, 24, 0.72)",
          border: "rgba(232, 185, 35, 0.10)",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-imperial": "var(--gradient-imperial)",
        "gradient-cyber": "var(--gradient-cyber)",
        "gradient-aurora": "var(--gradient-aurora)",
        "gradient-gold": "var(--gradient-gold)",
        glass: "var(--gradient-glass)",
      },

      boxShadow: {
        glass: "var(--shadow-glass)",
        "neon-gold": "0 0 20px hsl(44 95% 65% / 0.7), 0 0 50px hsl(44 80% 53% / 0.45)",
        "neon-cyan": "0 0 15px hsl(188 100% 60%), 0 0 35px hsl(188 100% 60% / 0.5)",
        "neon-purple": "0 0 15px hsl(258 90% 67%), 0 0 35px hsl(258 90% 67% / 0.5)",
        "neon-orange": "0 0 20px hsl(44 95% 65% / 0.7), 0 0 50px hsl(44 80% 53% / 0.45)",
        "neon-blue": "0 0 15px hsl(188 100% 60%), 0 0 35px hsl(188 100% 60% / 0.5)",
        "card-hover": "0 25px 50px -12px rgb(0 0 0 / 0.55)",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "1.25rem",
      },

      fontFamily: {
        display: ["Cormorant Garamond", "Fraunces", "Pretendard Variable", "serif"],
        imperial: ["Italiana", "Cormorant Garamond", "Pretendard Variable", "serif"],
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        title: ["Cormorant Garamond", "Fraunces", "Pretendard Variable", "serif"],
        hud: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
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
        "neon-pulse": {
          "0%, 100%": { opacity: "1", textShadow: "0 0 20px currentColor" },
          "50%": { opacity: "0.85", textShadow: "0 0 40px currentColor" },
        },
        "aurora-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "particle-float": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.8" },
          "100%": { transform: "translateY(-100px) scale(0)", opacity: "0" },
        },
        "balance-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        "jackpot-burst": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "40%": { transform: "scale(1.15)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "neon-flicker": {
          "0%, 100%": { opacity: "1" },
          "42%": { opacity: "0.8" },
          "64%": { opacity: "1" },
          "82%": { opacity: "0.9" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        aurora: "aurora-shift 15s ease infinite",
        particle: "particle-float 3s ease-out forwards",
        "balance-pop": "balance-pop 0.4s ease-out",
        "jackpot-burst": "jackpot-burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "neon-flicker": "neon-flicker 1.2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
