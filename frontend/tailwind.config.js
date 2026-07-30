/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0D10",
        panel: "#14171B",
        panel2: "#1B1F24",
        border: "#262B31",
        amber: "#F2A900",
        critical: "#E8432F",
        safe: "#2FB380",
        info: "#4A90D9",
        muted: "#7B8288",
        ink: "#E8E9EA",
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        hazard: "repeating-linear-gradient(135deg, #F2A900, #F2A900 10px, #0B0D10 10px, #0B0D10 20px)",
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(232,67,47,0.4)' },
          '50%': { borderColor: 'rgba(232,67,47,1)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.35s ease-out both',
        'pulse-border': 'pulseBorder 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
