/**
 * Maps common Printify color names to hex codes.
 * Printify's variant API returns color as a plain string ("Solid Black"), not { hex, title },
 * so this map is the only source for swatch hex values.
 *
 * Sourced from published color charts for Bella+Canvas, Gildan, Next Level,
 * Comfort Colors, AS Colour, and Sport-Tek — covers the bulk of Printify's
 * apparel catalog.
 */

const COLOR_MAP: Record<string, string> = {
  // Core neutrals
  white: '#FFFFFF',
  'solid white': '#FFFFFF',
  natural: '#F5F0E1',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  beige: '#F5F5DC',
  bone: '#E3DAC9',
  vintage: '#E5DDC8',

  // Blacks
  black: '#000000',
  'solid black': '#000000',
  'true black': '#000000',
  'jet black': '#0A0A0A',
  'pitch black': '#000000',

  // Greys
  'sport grey': '#90908E',
  'sport gray': '#90908E',
  'heather grey': '#B0AFA8',
  'heather gray': '#B0AFA8',
  'athletic heather': '#A6A6A6',
  'athletic grey': '#A6A6A6',
  'athletic gray': '#A6A6A6',
  'dark heather': '#3F3F3F',
  'dark heather grey': '#3F3F3F',
  'dark heather gray': '#3F3F3F',
  'graphite heather': '#5C5C5C',
  'dark grey': '#505050',
  'dark gray': '#505050',
  'light grey': '#D3D3D3',
  'light gray': '#D3D3D3',
  silver: '#C0C0C0',
  ash: '#B2BEB5',
  'ash grey': '#B2BEB5',
  'ash gray': '#B2BEB5',
  charcoal: '#36454F',
  'heather charcoal': '#3D3D3D',
  asphalt: '#3F3F44',
  'storm grey': '#4F6D7A',
  'storm gray': '#4F6D7A',
  storm: '#4F6D7A',
  slate: '#708090',
  stone: '#928E85',
  pewter: '#8E918F',
  smoke: '#738276',

  // Navy / blue
  navy: '#000080',
  'navy blue': '#000080',
  'dark navy': '#000033',
  'midnight navy': '#191970',
  midnight: '#191970',
  'true navy': '#1A2E5C',
  'heather navy': '#3C4F6E',
  'heather midnight navy': '#1F2640',
  royal: '#4169E1',
  'royal blue': '#4169E1',
  'true royal': '#1E4DC8',
  'heather royal': '#5A6FA8',
  'heather sapphire': '#4A7BAD',
  sapphire: '#0F52BA',
  cobalt: '#0047AB',
  indigo: '#4B0082',
  'steel blue': '#4682B4',
  'columbia blue': '#9BDDFF',
  'carolina blue': '#56A0D3',
  'light blue': '#ADD8E6',
  'ice blue': '#99CCFF',
  'sky blue': '#87CEEB',
  sky: '#87CEEB',
  'tropical blue': '#00BFFF',
  'denim heather': '#5F7A99',
  denim: '#1560BD',
  aqua: '#00FFFF',
  turquoise: '#40E0D0',
  teal: '#008080',
  'true blue': '#0073CF',

  // Greens
  green: '#008000',
  'kelly green': '#4CBB17',
  kelly: '#4CBB17',
  'irish green': '#009A44',
  'heather irish green': '#3E8E5C',
  'forest green': '#228B22',
  forest: '#228B22',
  'military green': '#4B5320',
  'heather military green': '#636B46',
  'dark green': '#006400',
  'turf green': '#3E7F3E',
  'heather green': '#5A8C5A',
  'heather forest': '#3F6B4A',
  'kiwi': '#8EE53F',
  lime: '#9EFD38',
  mint: '#98FF98',
  'heather mint': '#9CCCB5',
  seafoam: '#93E9BE',
  olive: '#808000',
  'olive green': '#808000',
  army: '#4B5320',
  sage: '#9CAF88',

  // Reds / pinks
  red: '#FF0000',
  'true red': '#BF0A30',
  'dark red': '#8B0000',
  'cardinal red': '#C41E3A',
  cardinal: '#C41E3A',
  'antique cherry red': '#9B111E',
  cherry: '#9B111E',
  'heather red': '#B55C5C',
  garnet: '#733635',
  maroon: '#800000',
  'heather maroon': '#7A3B4E',
  burgundy: '#800020',
  cranberry: '#9F2B68',
  wine: '#722F37',
  brick: '#9B3A3F',
  rust: '#B7410E',
  pink: '#FFC0CB',
  'light pink': '#FFB6C1',
  'hot pink': '#FF69B4',
  azalea: '#F19CBB',
  heliconia: '#FF5F7E',
  fuchsia: '#FF00FF',
  raspberry: '#E30B5D',
  'heather raspberry': '#B95C7C',
  rose: '#FF007F',
  'dusty pink': '#D9A6B0',
  mauve: '#E0B0B6',

  // Oranges / yellows / browns
  orange: '#FFA500',
  'safety orange': '#FF6600',
  'texas orange': '#BF5700',
  'burnt orange': '#CC5500',
  yellow: '#FFFF00',
  daisy: '#FFC72C',
  gold: '#FFD700',
  mustard: '#FFDB58',
  lemon: '#FFF44F',
  'pale yellow': '#FFFFCC',
  brown: '#8B4513',
  'dark chocolate': '#3D1C02',
  chocolate: '#7B3F00',
  coffee: '#6F4E37',
  espresso: '#3B2A21',
  tan: '#D2B48C',
  sand: '#C2B280',
  'heather dust': '#C8C2B6',
  dust: '#C8C2B6',
  khaki: '#C3B091',
  camel: '#C19A6B',
  caramel: '#AF6E4D',

  // Purples
  purple: '#800080',
  'team purple': '#4B2E83',
  'heather purple': '#7E5DA8',
  violet: '#7F00FF',
  lilac: '#C8A2C8',
  lavender: '#B57EDC',
  orchid: '#DA70D6',
  plum: '#8E4585',
  berry: '#8E4585',
  eggplant: '#614051',

  // Coral / sunset / misc
  coral: '#FF7F50',
  'coral silk': '#FF7F8E',
  salmon: '#FA8072',
  peach: '#FFE5B4',
  apricot: '#FBCEB1',
  sunset: '#FAD6A5',
  tweed: '#C8A882',
}

export interface ResolvedColor {
  hex: string
  isApproximate: boolean
}

const APPROXIMATE_FALLBACK = '#CCCCCC'

/**
 * Resolve a Printify color name to an RGB hex.
 * Exact match → fuzzy containment match → grey fallback flagged as approximate.
 * Approximate values let the UI render a "?" so users know the swatch isn't trustworthy.
 */
export function resolveColor(name: string): ResolvedColor {
  const lower = name.toLowerCase().trim()

  if (COLOR_MAP[lower]) return { hex: COLOR_MAP[lower], isApproximate: false }

  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return { hex, isApproximate: false }
  }

  return { hex: APPROXIMATE_FALLBACK, isApproximate: true }
}

/** Backwards-compatible shim for callers that only need the hex string. */
export function colorNameToHex(name: string): string {
  return resolveColor(name).hex
}
