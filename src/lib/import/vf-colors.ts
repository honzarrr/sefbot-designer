/**
 * Map VF color names to Sefbot hex color values.
 * These align with the STEP_COLORS palette in src/types/index.ts.
 */
const VF_COLOR_MAP: Record<string, string> = {
  'standard': '#607D8B',  // Grey-blue
  'blue':     '#4A90D9',
  'purple':   '#7B68EE',
  'red':      '#E74C3C',
  'orange':   '#F39C12',
  'green':    '#27AE60',
  'teal':     '#1ABC9C',
  'pink':     '#E91E63',
  'brown':    '#8D6E63',
  'dark':     '#2C3E50',
};

const DEFAULT_COLOR = '#607D8B'; // standard/grey-blue

/**
 * Convert a VF color name to a Sefbot hex color.
 * Returns the default grey-blue if the color name is unrecognized.
 */
export function vfColorToHex(vfColor: string | undefined): string {
  if (!vfColor) return DEFAULT_COLOR;
  return VF_COLOR_MAP[vfColor.toLowerCase()] ?? DEFAULT_COLOR;
}
