const IDEA_COMMAND = /^\/idea(?:@\w+)?(?:\s+([\s\S]*))?$/i

export function parseIdeaCommand(text: string): { ideaText: string } | null {
  const trimmed = text.trim()
  const match = trimmed.match(IDEA_COMMAND)
  if (!match) return null
  const ideaText = (match[1] ?? '').trim()
  return { ideaText }
}

export function projectNameFromIdea(ideaText: string, maxLen = 80): string {
  const singleLine = ideaText.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= maxLen) return singleLine || 'Untitled idea'
  return `${singleLine.slice(0, maxLen - 1).trimEnd()}…`
}
