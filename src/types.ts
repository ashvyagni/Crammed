export interface SourceRef {
  file: string
  page?: number
}

export type ExampleVisual = 'atom' | 'ionic' | 'force' | 'report' | 'gradient'

export interface Section {
  id: string
  title: string
  kind: 'paragraph' | 'bullets' | 'definition' | 'formula' | 'example' | 'trap' | 'recap'
  body?: string
  items?: string[]
  visual?: ExampleVisual
  source?: SourceRef
}

export interface Topic {
  id: string
  title: string
  minutes: number
  sections: Section[]
  source?: SourceRef
}

export interface Question {
  id: string
  prompt: string
  options: string[]
  answer: number
  explanation: string
  topicId: string
  source?: SourceRef
}

export interface Module {
  id: string
  title: string
  description: string
  accent: string
  sourceFiles?: string[]
  topics: Topic[]
  questions: Question[]
}

export interface Subject {
  id: string
  name: string
  shortName: string
  color: string
  modules: Module[]
}

export interface Progress {
  completedTopics: string[]
  completedModules: string[]
  testResults: Record<string, { score: number; total: number; completedAt: string; answers: Record<string, number> }>
  lastStudied?: { subjectId: string; moduleId: string; topicId: string }
}
