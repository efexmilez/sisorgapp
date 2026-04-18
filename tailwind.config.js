/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Stitch Design System: The Architectural Integrity
        primary: {
          DEFAULT: '#003B5A',
          container: '#1A5276',
          fixed: '#CBE6FF',
          'fixed-dim': '#9BCCF6',
        },
        secondary: {
          DEFAULT: '#4F6070',
          container: '#D2E5F8',
          fixed: '#D2E5F8',
          'fixed-dim': '#B6C9DB',
        },
        tertiary: {
          DEFAULT: '#4D3100',
          container: '#FFDDb3',
          fixed: '#FFDDb3',
          'fixed-dim': '#F2BD74',
        },
        error: {
          DEFAULT: '#BA1A1A',
          container: '#FFdad6',
        },
        surface: {
          DEFAULT: '#F8F9FA',
          bright: '#F8F9FA',
          dim: '#D9DADB',
          container: {
            lowest: '#FFFFFF',
            low: '#F3F4F5',
            DEFAULT: '#EDEEEF',
            high: '#E7E8E9',
            highest: '#E1E3E4',
          },
          tint: '#2F6388',
        },
        background: '#F8F9FA',
        on: {
          primary: {
            DEFAULT: '#FFFFFF',
            container: '#94C5EE',
            fixed: '#001E30',
            'fixed-variant': '#0E4B6E',
          },
          secondary: {
            DEFAULT: '#FFFFFF',
            container: '#556676',
            fixed: '#0B1D2B',
            'fixed-variant': '#374958',
          },
          tertiary: {
            DEFAULT: '#FFFFFF',
            container: '#EAB66D',
            fixed: '#291800',
            'fixed-variant': '#633F00',
          },
          error: {
            DEFAULT: '#FFFFFF',
            container: '#93000A',
          },
          surface: {
            DEFAULT: '#191C1D',
            variant: '#41474E',
          },
          background: '#191C1D',
        },
        outline: '#72787F',
        'outline-variant': '#C1C7CF',
        inverse: {
          surface: '#2E3132',
          primary: '#9BCCF6',
          on: '#F0F1F2',
        },
        'surface-variant': '#E1E3E4',
        'on-secondary-container': '#556676',
        // Aliases for compatibility
        'on-primary-fixed': '#001E30',
        'on-secondary-container': '#556676',
        'surface-bright': '#F8F9FA',
        'error-container': '#FFdad6',
        'on-error': '#FFFFFF',
        'tertiary': '#4D3100',
        'surface-variant': '#E1E3E4',
        'secondary-fixed-dim': '#B6C9DB',
        'inverse-on-surface': '#F0F1F2',
        'on-tertiary-fixed': '#291800',
        'secondary-fixed': '#D2E5F8',
        'surface-container-lowest': '#FFFFFF',
        'on-primary-fixed-variant': '#0E4B6E',
        'tertiary-container': '#6B4604',
        'on-tertiary-fixed-variant': '#633F00',
        'on-secondary-fixed': '#0B1D2B',
        'surface-container-high': '#E7E8E9',
        'primary-fixed': '#CBE6FF',
        'primary-container': '#1A5276',
        'tertiary-fixed': '#FFDDb3',
        'primary': '#003B5A',
        'on-primary': '#FFFFFF',
        'inverse-primary': '#9BCCF6',
        'surface-container-highest': '#E1E3E4',
        'error': '#BA1A1A',
        'surface-tint': '#2F6388',
        'outline': '#72787F',
        'background': '#F8F9FA',
        'on-background': '#191C1D',
        'outline-variant': '#C1C7CF',
        'secondary-container': '#D2E5F8',
        'surface-container': '#EDEEEF',
        'on-tertiary-container': '#EAB66D',
        'inverse-surface': '#2E3132',
        'tertiary-fixed-dim': '#F2BD74',
        'on-primary-container': '#94C5EE',
        'surface-dim': '#D9DADB',
        'on-surface': '#191C1D',
        'primary-fixed-dim': '#9BCCF6',
        'surface': '#F8F9FA',
        'on-surface-variant': '#41474E',
        'on-tertiary': '#FFFFFF',
        'secondary': '#4F6070',
        'on-error-container': '#93000A',
        'on-secondary-fixed-variant': '#374958',
        'on-secondary': '#FFFFFF',
        'surface-container-low': '#F3F4F5',
      },
      borderRadius: {
        DEFAULT: '0.375rem', // md - 6px
        md: '0.375rem',       // md - 6px
        lg: '0.5rem',         // lg - 8px
        xl: '0.75rem',        // xl - 12px
        full: '0.75rem',      // full - 12px (ROUND_FOUR in Stitch)
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        // Ambient shadows with primary tint - 40px blur, 4% opacity
        'ambient': '0 0 40px rgba(0, 59, 90, 0.04)',
        'ambient-lg': '0 0 60px rgba(0, 59, 90, 0.06)',
      },
    },
  },
  plugins: [],
};
