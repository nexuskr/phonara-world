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

        // === Cyber Luxury Color Palette ===
        neon: {
          orange: "#FF3B00",
          blue: "#00F0FF",
          purple: "#C724FF",
        },
        gold: {
          DEFAULT: "#FFD700",
          light: "#FFEA80",
          dark: "#D4AF37",
        },

        primary: {
          DEFAULT: "#FF3B00", // Electric Neon Orange
          foreground: "#000000",
          glow: "rgba(255, 59, 0, 0.6)",
        },
        secondary: {
          DEFAULT: "#00F0FF", // Cyber Blue
          foreground: "#000000",
        },
        accent: {
          DEFAULT: "#C724FF", // Purple
          foreground: "#FFFFFF",
        },

        glass: {
          DEFAULT: "rgba(17, 17, 17, 0.65)",
          border: "rgba(255, 255, 255, 0.08)",
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
        "gradient-primary": "linear-gradient(135deg, #FF3B00, #FF8A00)",
        "gradient-cyber": "linear-gradient(135deg, #00F0FF, #C724FF, #FF3B00)",
        "gradient-aurora": "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(199,36,255,0.15), rgba(255,59,0,0.15))",
        "gradient-gold": "linear-gradient(90deg, #FFD700, #FFEA80, #FFD700)",
        glass: "linear-gradient(145deg, rgba(17,17,17,0.85), rgba(11,11,11,0.75))",
      },

      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        "neon-orange": "0 0 15px #FF3B00, 0 0 35px rgba(255,59,0,0.6)",
        "neon-blue": "0 0 15px #00F0FF, 0 0 35px rgba(0,240,255,0.5)",
        "neon-purple": "0 0 15px #C724FF, 0 0 35px rgba(199,36,255,0.5)",
        "neon-gold": "0 0 20px #FFD700, 0 0 40px rgba(255,215,0,0.6)",
        "card-hover": "0 25px 50px -12px rgb(0 0 0 / 0.4)",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "1.25rem",
      },

      fontFamily: {
        display: ["Orbitron", "Pretendard", "sans-serif"], // Cyber 느낌 강하게
        sans: ["Pretendard", "system-ui", "sans-serif"],
        title: ["Satoshi", "Orbitron", "sans-serif"],
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
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        aurora: "aurora-shift 15s ease infinite",
        particle: "particle-float 3s ease-out forwards",
        "balance-pop": "balance-pop 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
