// App theme — soft lavender/purple palette for the chronic illness audience
// Calm, accessible, non-clinical.

export const colors = {
  primary: '#7C5CBF',
  primaryLight: '#B39DDB',
  background: '#F5F3FF',
  card: '#FFFFFF',
  text: '#2D2D2D',
  textMuted: '#888888',
  success: '#66BB6A',
  danger: '#EF5350',
  border: '#E0D7F5',
};

/**
 * Severity colors: index 0 = severity 1 (mild/green) → index 4 = severity 5 (severe/red)
 * Usage: severity[entry.severity - 1]
 */
export const severity: string[] = [
  '#66BB6A', // 1 – mild – green
  '#AED581', // 2 – low – light green
  '#FFA726', // 3 – moderate – orange
  '#FF7043', // 4 – high – deep orange
  '#EF5350', // 5 – severe – red
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSize = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
};
