export function buildIdeaResearchPlanPrompt(ideaDescription: string): { system: string; user: string } {
  return {
    system: `You are a print-on-demand t-shirt niche researcher. Given a product idea description, produce a research plan to gather real trend signals before theme generation.

Respond ONLY with valid JSON in this exact format:
{
  "projectTitle": "Short catchy project name (3-8 words, no trademarks)",
  "inferredAudience": "Specific target audience who would buy this shirt",
  "subreddits": ["subreddit1", "subreddit2"],
  "keywords": {
    "google": ["keyword1", "keyword2"],
    "pinterest": ["keyword1", "keyword2"],
    "tiktok": ["keyword1", "keyword2"]
  }
}

Rules:
- projectTitle: concise, commercial, describes the niche — NOT the raw user text
- subreddits: 2-4 names WITHOUT the r/ prefix; pick communities where this audience actually hangs out
- keywords: 2-4 per platform; search terms likely to surface trending content for this niche
- No trademarked names, copyrighted franchises, or celebrity names in any field`,
    user: `Product idea description:\n${ideaDescription.trim()}`,
  }
}
