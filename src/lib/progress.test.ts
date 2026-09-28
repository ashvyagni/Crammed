import { describe, expect, it } from 'vitest'
import { buildCatalog, catalog, validateModule } from '../data/catalog'
import { moduleKey, topicKey } from './progress'

describe('catalog grouping', () => {
  it('includes only the two release subjects in study order', () => {
    expect(catalog.map((subject) => subject.name)).toEqual([
      'Applied Chemistry',
      'Technical English',
    ])
    expect(catalog.map((subject) => subject.modules.map((module) => module.id))).toEqual([
      ['applied-chemistry/module-02', 'applied-chemistry/module-03', 'applied-chemistry/module-04'],
      ['technical-english/module-01'],
    ])
  })

  it('keeps the Technical English lessons in observed paper order and within its writing limits', () => {
    const module = catalog.find((subject) => subject.id === 'technical-english')?.modules[0]
    if (!module) throw new Error('Technical English release module is missing.')

    expect(module.topics.map((topic) => topic.id)).toEqual([
      'definition-writing',
      'reading-inference',
      'abstract-writing',
      'conflict-management',
      'statement-of-purpose',
    ])
    expect(module.questions.length).toBeGreaterThanOrEqual(15)

    const wordCount = (sectionId: string) => {
      const section = module.topics.flatMap((topic) => topic.sections).find((item) => item.id === sectionId)
      if (!section?.body) throw new Error(`Writing model "${sectionId}" is missing.`)
      return section.body.trim().split(/\s+/).length
    }

    expect(wordCount('abstract-model')).toBeGreaterThanOrEqual(100)
    expect(wordCount('abstract-model')).toBeLessThanOrEqual(120)
    expect(wordCount('sop-model')).toBeGreaterThanOrEqual(200)
    expect(wordCount('sop-model')).toBeLessThanOrEqual(250)
  })

  it('groups modules by the subject prefix and sorts the module path', () => {
    const subjects = buildCatalog([
      { id: 'chemistry/module-02', title: 'Second', description: '', accent: 'clay', topics: [], questions: [] },
      { id: 'chemistry/module-01', title: 'First', description: '', accent: 'clay', topics: [], questions: [] },
      { id: 'physics/module-01', title: 'Motion', description: '', accent: 'sage', topics: [], questions: [] },
    ])

    expect(subjects.map((subject) => subject.name)).toEqual(['Chemistry', 'Physics'])
    expect(subjects[0].modules.map((module) => module.title)).toEqual(['First', 'Second'])
  })

  it('rejects malformed generated content with a useful location', () => {
    expect(() => validateModule({ id: 'broken', topics: [] }, 'content/subjects/broken/module.json'))
      .toThrow('content/subjects/broken/module.json: id must look like "subject-slug/module-01".')
  })

  it('requires a worked example in every published topic', () => {
    expect(() => validateModule({
      id: 'chemistry/module-01',
      title: 'Atoms',
      description: '',
      accent: 'clay',
      topics: [{ id: 'protons', title: 'Protons', minutes: 3, sections: [] }],
      questions: [],
    }, 'content/subjects/chemistry/module-01/module.json'))
      .toThrow('every topic must include a worked example with a non-empty explanation.')
  })
})

describe('progress identifiers', () => {
  it('creates stable scoped keys', () => {
    expect(topicKey('chemistry', 'module-01', 'equilibrium')).toBe('chemistry/module-01/equilibrium')
    expect(moduleKey('chemistry', 'module-01')).toBe('chemistry/module-01')
  })
})
