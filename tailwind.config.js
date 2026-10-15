/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  // Hover styles only where there is a real pointer. On a phone a tapped
  // button kept its hover colour until the next tap somewhere else.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // Site-wide type: everything renders in the admin dashboard's clean sans
      // stack. Both `font-sans` and `font-serif` resolve here, so legacy
      // `font-serif` headings pick it up without touching 60+ files. Cormorant
      // Garamond is retired brand-wide.
      fontFamily: {
        sans: ['Söhne', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Söhne', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      // What these three have always rendered as. They used to be read from a
      // --radius variable left over from the Base44 scaffold (2px), which made
      // `rounded-md` and `rounded-sm` silently square.
      borderRadius: {
        lg: '2px',
        md: '0px',
        sm: '0px',
      },
      // The admin's palette. Each colour is a CSS variable (see
      // src/components/admin/admin.css), so dark mode swaps the variables and
      // no component has to carry a second colour for it.
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--c-ink-muted) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          strong: 'rgb(var(--c-line-strong) / <alpha-value>)',
        },
        rose: {
          DEFAULT: 'rgb(var(--c-rose) / <alpha-value>)',
          soft: 'rgb(var(--c-rose-soft) / <alpha-value>)',
          wash: 'rgb(var(--c-rose-wash) / <alpha-value>)',
        },
        tone: {
          pending: 'rgb(var(--c-pending) / <alpha-value>)',
          confirmed: 'rgb(var(--c-confirmed) / <alpha-value>)',
          alert: 'rgb(var(--c-alert) / <alpha-value>)',
          done: 'rgb(var(--c-done) / <alpha-value>)',
          consult: 'rgb(var(--c-consult) / <alpha-value>)',
        },
      },
      // The admin's one curve (easeOutQuint): quick to answer, long to settle.
      transitionTimingFunction: {
        quint: 'cubic-bezier(0.22, 1, 0.36, 1)',
        sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}
