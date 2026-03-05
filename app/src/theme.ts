// Ebb Design System — System fonts (SF Pro) + Warm Coral Palette

export const colors = {
  // --- Brand ---
  primary:        '#E8725A',  // Warm coral — CTAs, active states, brand moments
  primaryDark:    '#C2553F',  // Terracotta — pressed states, dark emphasis
  primaryLight:   '#FADED4',  // Peach — tag fills, chip backgrounds, light accents

  // --- Secondary ---
  amber:          '#F5A962',  // Secondary charts, mild severity, warm data
  sage:           '#7EB8A4',  // "Good" / calm states, low severity, complementary

  // --- Backgrounds ---
  background:     '#FDF8F5',  // Warm cream — app background (NOT pure white)
  surface:        '#FFFFFF',  // Card surfaces — float on cream background
  surfaceGlass:   'rgba(255,255,255,0.18)',  // Liquid glass card fill
  surfaceGlassCream: 'rgba(255,255,255,0.52)', // Glass fill on cream bg
  borderGlassCream:  'rgba(255,255,255,0.78)', // Glass border on cream bg

  // --- Text ---
  text:           '#2D2926',  // Warm near-black — headlines, body text
  textMuted:      '#6B625D',  // Warm gray — subtitles, metadata, labels (darkened for WCAG AA)
  textInverse:    '#FFFFFF',  // White text on dark/glass surfaces

  // --- Utility ---
  border:         'rgba(232,114,90,0.15)',  // Warm-tinted border
  borderGlass:    'rgba(255,255,255,0.28)', // Glass edge highlight
  shadow:         'rgba(194,85,63,0.12)',   // Warm-tinted shadow (not cool gray)

  // --- Backward-compat aliases (remove when screens are redesigned) ---
  card:           '#FFFFFF',  // alias for surface
  success:        '#7EB8A4',  // alias for sage
  danger:         '#C2553F',  // alias for primaryDark
};

/**
 * Severity scale — wide hue separation for accessibility (G5)
 * Teal → green → gold → coral → red
 * Distinguishable even for most colorblind users.
 * Index 0 = severity 1 (lowest) -> index 4 = severity 5 (highest)
 * Usage: severity[entry.severity - 1]
 */
export const severity: string[] = [
  '#2A9D8F',  // 1 – mild – teal green
  '#6BBF59',  // 2 – low – green
  '#E9A830',  // 3 – moderate – amber/gold
  '#E8725A',  // 4 – high – coral
  '#D4483B',  // 5 – severe – strong red
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   22,
  xxl:  28,
  xxxl: 34,
};

export const radius = {
  sm:      8,
  md:      14,
  lg:      22,
  xl:      28,
  pill:    100,
};

export const fontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
};

/**
 * Per-symptom unique colors (G3).
 * Each symptom gets a permanent color for icons, bars, dots, and charts.
 * Higher saturation and wider hue range than v1.
 */
export const symptomColors: Record<string, string> = {
  'pain':          '#D4483B',  // strong red — waveform icon
  'fatigue':       '#E8725A',  // coral — battery icon
  'brain fog':     '#2A9D8F',  // teal — cloud icon
  'nausea':        '#E9A830',  // golden amber — wavy lines icon
  'headache':      '#7B4EA3',  // purple — lightning bolt icon
  'anxiety':       '#4A7FBB',  // blue — spiral icon
  'dizziness':     '#D4883B',  // orange — circular arrows icon
  'joint pain':    '#C44569',  // rose — joint symbol icon
  'sleep quality': '#6C63FF',  // indigo — proper crescent moon icon
  'mood':          '#2EAD6B',  // green — signal bars icon
  'depression':    '#7B4EA3',  // purple — bar chart icon
  'appetite':      '#43A692',  // sage green — appetite/eating icon
  'heart rate':    '#D4483B',  // red — heart icon
  'energy':        '#E9A830',  // amber — energy icon
};

/**
 * Get the unique color for a symptom name.
 * Case-insensitive, partial match (same logic as SymptomIcon).
 * Returns colors.primary for unknown symptoms.
 */
export function getSymptomColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(symptomColors)) {
    if (lower.includes(key)) return color;
  }
  return colors.primary;
}

/** Apple HIG constants */
export const HIG = {
  minTouchTarget: 44,
  compactMargin: 16,  // same as spacing.md
};
