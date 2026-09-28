import type { Module, Section, Subject, Topic, Question } from '../types'

const sectionKinds = new Set(['paragraph', 'bullets', 'definition', 'formula', 'example', 'trap', 'recap'])
const exampleVisuals = new Set(['atom', 'ionic', 'force', 'report', 'gradient'])

const moduleFiles = import.meta.glob<unknown>('../../content/subjects/**/module.json', {
  eager: true,
  import: 'default',
})

const modules = Object.entries(moduleFiles).map(([path, module]) => validateModule(module, path))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSourceRef(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.file === 'string' &&
    (value.page === undefined || (Number.isInteger(value.page) && (value.page as number) > 0))
}

function isSection(value: unknown): value is Section {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') return false
  if (typeof value.kind !== 'string' || !sectionKinds.has(value.kind)) return false
  if (value.body !== undefined && typeof value.body !== 'string') return false
  if (value.items !== undefined && (!Array.isArray(value.items) || !value.items.every((item) => typeof item === 'string'))) return false
  if (value.source !== undefined && !isSourceRef(value.source)) return false
  if (value.visual !== undefined && (value.kind !== 'example' || typeof value.visual !== 'string' || !exampleVisuals.has(value.visual))) return false
  if (value.kind === 'bullets' && !Array.isArray(value.items)) return false
  return true
}

function isTopic(value: unknown): value is Topic {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.minutes === 'number' &&
    value.minutes > 0 &&
    (value.source === undefined || isSourceRef(value.source)) &&
    Array.isArray(value.sections) &&
    value.sections.every(isSection)
}

function isQuestion(value: unknown, topicIds: Set<string>): value is Question {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.prompt === 'string' &&
    Array.isArray(value.options) &&
    value.options.length >= 2 &&
    value.options.every((option) => typeof option === 'string') &&
    Number.isInteger(value.answer) &&
    (value.answer as number) >= 0 &&
    (value.answer as number) < value.options.length &&
    typeof value.explanation === 'string' &&
    typeof value.topicId === 'string' &&
    topicIds.has(value.topicId) &&
    (value.source === undefined || isSourceRef(value.source))
}

export function validateModule(value: unknown, sourcePath: string): Module {
  const fail = (reason: string): never => {
    throw new Error(`Invalid module content in ${sourcePath}: ${reason}`)
  }

  if (!isRecord(value)) return fail('expected a JSON object.')
  if (typeof value.id !== 'string' || !/^[a-z0-9-]+\/module-\d{2}$/.test(value.id)) return fail('id must look like "subject-slug/module-01".')
  if (typeof value.title !== 'string' || !value.title.trim()) return fail('title must be a non-empty string.')
  if (typeof value.description !== 'string') return fail('description must be a string.')
  if (typeof value.accent !== 'string') return fail('accent must be a string.')
  if (!Array.isArray(value.topics) || !value.topics.every(isTopic)) return fail('topics must contain valid topics and sections.')
  if (!Array.isArray(value.questions)) return fail('questions must be an array (it may be empty for an unreviewed draft).')
  const topics = value.topics as Topic[]
  if (topics.some((topic) => !topic.sections.some((section) => section.kind === 'example' && section.body?.trim()))) {
    return fail('every topic must include a worked example with a non-empty explanation.')
  }
  const questions = value.questions as unknown[]
  const topicIds = new Set(topics.map((topic) => topic.id))
  if (!questions.every((question) => isQuestion(question, topicIds))) return fail('each question must have 2+ options, an in-range answer, an explanation, and an existing topicId.')
  if (value.sourceFiles !== undefined && (!Array.isArray(value.sourceFiles) || !value.sourceFiles.every((file) => typeof file === 'string'))) return fail('sourceFiles must be an array of strings.')
  return {
    id: value.id,
    title: value.title,
    description: value.description,
    accent: value.accent,
    topics,
    questions: questions as Question[],
    ...(value.sourceFiles ? { sourceFiles: value.sourceFiles as string[] } : {}),
  }
}

export function buildCatalog(allModules: Module[]): Subject[] {
  const grouped = new Map<string, Module[]>()

  for (const module of allModules) {
    const subjectId = module.id.split('/')[0]
    const group = grouped.get(subjectId) ?? []
    group.push(module)
    grouped.set(subjectId, group)
  }

  const order = ['applied-chemistry', 'basic-engineering', 'technical-english', 'multivariable-calculus']
  return [...grouped.entries()]
    .sort(([first], [second]) => {
      const firstOrder = order.indexOf(first)
      const secondOrder = order.indexOf(second)
      return (firstOrder < 0 ? Number.MAX_SAFE_INTEGER : firstOrder) - (secondOrder < 0 ? Number.MAX_SAFE_INTEGER : secondOrder) || first.localeCompare(second)
    })
    .map(([id, subjectModules]) => {
    const subjectModulesSorted = subjectModules.sort((a, b) => a.id.localeCompare(b.id))
    const colors: Record<string, string> = {
      'applied-chemistry': '#c2a260',
      'basic-engineering': '#a7aaa9',
      'technical-english': '#d0c4a5',
      'multivariable-calculus': '#909394',
    }
    const names: Record<string, string> = {
      'applied-chemistry': 'Applied Chemistry',
      'basic-engineering': 'Basic Engineering',
      'technical-english': 'Technical English',
      'multivariable-calculus': 'Multivariable Calculus',
    }
    const name = names[id] ?? id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

    return {
      id,
      name,
      shortName: name.slice(0, 3).toUpperCase(),
      color: colors[id] ?? '#897b60',
      modules: subjectModulesSorted,
    }
    })
}

const releasedModules = new Set([
  'applied-chemistry/module-02',
  'applied-chemistry/module-03',
  'applied-chemistry/module-04',
  'technical-english/module-01',
])
export const catalog = buildCatalog(modules.filter((module) => releasedModules.has(module.id)))
