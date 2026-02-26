// Ebb Design System v2 — Warm Topographic + Liquid Glass
// Primary font: DM Sans (loaded in App.tsx)

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
  textMuted:      '#7A706B',  // Warm gray — subtitles, metadata, labels
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
 * Severity scale — warm terrain metaphor (no harsh red/green binary)
 * Index 0 = severity 1 (lowest) -> index 4 = severity 5 (highest)
 * Usage: severity[entry.severity - 1]
 */
export const severity: string[] = [
  '#7EB8A4',  // 1 – calm – sage green
  '#B8D4A8',  // 2 – low – sage-amber transition
  '#F5A962',  // 3 – moderate – amber
  '#E8725A',  // 4 – high – coral
  '#C2553F',  // 5 – severe – deep terracotta
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
  xxxl: 36,
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
