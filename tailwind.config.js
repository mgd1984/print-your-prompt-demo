/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          purple: "#4A00E0",
          violet: "#8E2DE2",
          blue: "#2D6CE2",
          pink: "#FF4ECD",
          teal: "#00B4D8",
          dark: "#1A0B2E",
          light: "#F5F1FF",
        },
        background: {
          dark: "#1A0B2E",
          DEFAULT: "#1A0B2E",
          light: "#F5F1FF",
        },
        gradient: {
          start: "#4A00E0",
          mid: "#8E2DE2",
          end: "#2D6CE2",
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-in-out",
        "slide-up": "slide-up 0.6s ease-out",
        "slide-down": "slide-down 0.6s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow": {
          "0%": { boxShadow: "0 0 5px rgba(138, 43, 226, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(138, 43, 226, 0.8), 0 0 30px rgba(74, 0, 224, 0.6)" },
        }
      },
      backdropBlur: {
        xs: "2px",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(to right, #4A00E0, #8E2DE2)',
        'gradient-secondary': 'linear-gradient(to right, #8E2DE2, #2D6CE2)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(138, 43, 226, 0.5)',
        'glow-md': '0 0 15px rgba(138, 43, 226, 0.6)',
        'glow-lg': '0 0 20px rgba(138, 43, 226, 0.7), 0 0 30px rgba(74, 0, 224, 0.5)',
        'inner-glow': 'inset 0 0 15px rgba(138, 43, 226, 0.4)',
      },
    },
  },
  plugins: [],
} 