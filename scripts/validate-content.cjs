const fs = require('node:fs/promises')
const path = require('node:path')

const contentRoot = path.resolve(__dirname, '..', 'content', 'subjects')

function assert(condition, file, reason) {
  if (!condition) throw new Error(`${file}: ${reason}`)
}

async function visit(directory) {
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await visit(fullPath))
    else if (entry.isFile() && entry.name === 'module.json') files.push(fullPath)
  }
  return files
}

async function validate(file) {
  const relative = path.relative(process.cwd(), file)
  let module
  try {
    module = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`${relative}: invalid JSON (${error.message})`)
  }
  assert(module && typeof module === 'object' && !Array.isArray(module), relative, 'expected a JSON object.')
  assert(typeof module.id === 'string' && /^[a-z0-9-]+\/module-\d{2}$/.test(module.id), relative, 'id must look like "subject-slug/module-01".')
  assert(typeof module.title === 'string' && module.title.trim(), relative, 'title must be a non-empty string.')
  assert(typeof module.description === 'string', relative, 'description must be a string.')
  assert(Array.isArray(module.topics), relative, 'topics must be an array.')
  const topicIds = new Set()
  for (const [index, topic] of module.topics.entries()) {
    assert(topic && typeof topic.id === 'string' && typeof topic.title === 'string', relative, `topic ${index + 1} needs an id and title.`)
    assert(Number.isFinite(topic.minutes) && topic.minutes > 0, relative, `topic "${topic.id}" needs positive minutes.`)
    assert(Array.isArray(topic.sections), relative, `topic "${topic.id}" needs a sections array.`)
    topicIds.add(topic.id)
    for (const section of topic.sections) {
      assert(section && typeof section.id === 'string' && typeof section.title === 'string', relative, `topic "${topic.id}" has a section without an id or title.`)
      assert(['paragraph', 'bullets', 'definition', 'formula', 'example', 'trap', 'recap'].includes(section.kind), relative, `section "${section.id}" has an unsupported kind.`)
      if (section.kind === 'bullets') assert(Array.isArray(section.items) && section.items.every((item) => typeof item === 'string'), relative, `bullet section "${section.id}" needs string items.`)
      if (section.body !== undefined) assert(typeof section.body === 'string', relative, `section "${section.id}" body must be text.`)
      if (section.visual !== undefined) assert(section.kind === 'example' && ['atom', 'ionic', 'force', 'report', 'gradient'].includes(section.visual), relative, `section "${section.id}" has an unsupported example visual.`)
    }
    assert(topic.sections.some((section) => section.kind === 'example' && typeof section.body === 'string' && section.body.trim()), relative, `topic "${topic.id}" needs a worked example with a non-empty explanation.`)
  }
  assert(Array.isArray(module.questions), relative, 'questions must be an array.')
  for (const [index, question] of module.questions.entries()) {
    assert(question && typeof question.id === 'string' && typeof question.prompt === 'string', relative, `question ${index + 1} needs an id and prompt.`)
    assert(Array.isArray(question.options) && question.options.length >= 2 && question.options.every((option) => typeof option === 'string'), relative, `question "${question.id}" needs at least two string options.`)
    assert(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, relative, `question "${question.id}" has an answer outside its options.`)
    assert(typeof question.explanation === 'string', relative, `question "${question.id}" needs an explanation.`)
    assert(topicIds.has(question.topicId), relative, `question "${question.id}" references unknown topic "${question.topicId}".`)
  }
}

async function main() {
  const files = await visit(contentRoot)
  if (files.length === 0) {
    process.stdout.write('No published module.json files found.\n')
    return
  }
  for (const file of files) await validate(file)
  process.stdout.write(`Validated ${files.length} module file(s).\n`)
}

main().catch((error) => {
  process.stderr.write(`Content validation failed: ${error.message}\n`)
  process.exitCode = 1
})
