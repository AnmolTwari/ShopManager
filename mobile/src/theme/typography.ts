// Typography scale - single source of truth for mobile
export const typography = {
  size: {
    xs: 10,
    sm: 11,
    base: 12,
    md: 13,
    lg: 14,
    xl: 15,
    '2xl': 16,
    '3xl': 18,
    '4xl': 20,
    '5xl': 24,
    '6xl': 28,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },
  // Preset text styles (like Tailwind prose)
  caption: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  label: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  title: { fontSize: 16, fontWeight: '800' as const },
  heading: { fontSize: 18, fontWeight: '800' as const },
} as const;
