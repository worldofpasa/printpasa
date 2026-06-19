import assert from 'node:assert/strict'

const IDEA_COMMAND = /^\/idea(?:@\w+)?(?:\s+([\s\S]*))?$/i

function parseIdeaCommand(text) {
  const trimmed = text.trim()
  const match = trimmed.match(IDEA_COMMAND)
  if (!match) return null
  const ideaText = (match[1] ?? '').trim()
  return { ideaText }
}

assert.deepEqual(parseIdeaCommand('/idea ultimate packing list'), {
  ideaText: 'ultimate packing list',
})
assert.deepEqual(parseIdeaCommand('/idea@PrintPasaBot diaper bag'), {
  ideaText: 'diaper bag',
})
assert.equal(parseIdeaCommand('/help'), null)
assert.deepEqual(parseIdeaCommand('/idea'), { ideaText: '' })

console.log('parse-idea checks passed')
