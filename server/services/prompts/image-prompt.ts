import {
  FAL_MODEL_GRAPHIC,
  FAL_MODEL_HYBRID,
  modelForDesignLane,
  splitPromptCounts,
  type DesignLane,
} from '../image-generation/lanes'

export type ImagePromptLLMResult = {
  designLane: DesignLane
  sloganText: string | null
  promptText: string
  style: string
  backgroundColorHex: string
  backgroundColorName: string
}

export function buildImagePromptPrompt(params: {
  theme: {
    title: string
    description: string
    contextNotes?: string | null
    targetDemographic?: string | null
  }
  count: number
}): { system: string; user: string } {
  const { hybridCount, graphicCount } = splitPromptCounts(params.count)

  return {
    system: `You are an expert prompt engineer for AI image generators (Flux, Ideogram) producing premium, print-ready t-shirt graphics.

Generate prompts in two design lanes:

## Lane: graphic (${graphicCount} prompts)
- PURELY visual — NO text, words, letters, numbers, or gibberish characters.
- Best for: mascots, emblems, icons, illustrations, surreal art.
- Target model: Flux (illustration-focused).
- Specify: art style, subject, composition, crisp clean edges, solid uniform background, high contrast.
- prompt must end with constraints like "no mockups, no t-shirt, no text, clean vector borders".

## Lane: hybrid (${hybridCount} prompts)
- Graphic PLUS a short slogan — this is the primary commercial lane for identity/humor tees.
- sloganText: exactly 2–5 words, uppercase-friendly, niche-specific (e.g. "SMOKE SHOW", "PLANT DAD", "CODE NAP").
- promptText MUST include the exact slogan in straight double quotes, e.g. bold distressed text reading "SMOKE SHOW".
- Describe typography style (bold sans-serif, vintage slab, handwritten script) and how text relates to the graphic.
- Target model: Ideogram (text rendering).
- Same print rules: design only (no mockups), solid background, clean edges, bold high contrast.

Shared rules for ALL prompts:
1. Design ONLY — no mockups, t-shirts, mannequins, models, hangers, or flat-lays.
2. Clean removable borders — crisp edges, no border vignettes or fuzzy edge gradients.
3. Solid background — specify uniform color (e.g. "isolated on solid black background").
4. Defined art style — flat vector, vintage screenprint, retro cartoon, sticker style, etc.

Respond ONLY with valid JSON:
{
  "prompts": [
    {
      "designLane": "graphic" or "hybrid",
      "sloganText": "2-5 WORD SLOGAN" for hybrid, null for graphic,
      "promptText": "Full generation prompt",
      "style": "style category",
      "backgroundColorHex": "#000000",
      "backgroundColorName": "black"
    }
  ]
}`,
    user: `Generate exactly ${params.count} image prompts for this t-shirt theme: ${hybridCount} hybrid (with slogan) and ${graphicCount} graphic (no text).

Title: ${params.theme.title}
Description: ${params.theme.description}
${params.theme.contextNotes ? `Design Direction: ${params.theme.contextNotes}` : ''}
${params.theme.targetDemographic ? `Target Audience: ${params.theme.targetDemographic}` : ''}

Vary art styles across prompts. Hybrid slogans must feel native to this niche — not generic.`,
  }
}

export function normalizeImagePromptResult(raw: {
  designLane?: string
  sloganText?: string | null
  promptText: string
  style: string
  backgroundColorHex?: string
  backgroundColorName?: string
}): ImagePromptLLMResult & { recommendedModel: string } {
  const designLane: DesignLane = raw.designLane === 'graphic' ? 'graphic' : 'hybrid'
  const sloganText = designLane === 'hybrid' && raw.sloganText?.trim()
    ? raw.sloganText.trim().slice(0, 80)
    : null

  return {
    designLane,
    sloganText,
    promptText: raw.promptText,
    style: raw.style,
    backgroundColorHex: raw.backgroundColorHex || '#000000',
    backgroundColorName: raw.backgroundColorName || 'black',
    recommendedModel: modelForDesignLane(designLane),
  }
}

export { FAL_MODEL_GRAPHIC, FAL_MODEL_HYBRID }
