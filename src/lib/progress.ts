import type { Progress } from '../types'

const STORAGE_KEY = 'crammed-progress-v1'

export const emptyProgress: Progress = {
  completedTopics: [],
  completedModules: [],
  testResults: {},
}

export function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress
    const parsed: unknown = JSON.parse(raw)
    if (!isProgress(parsed)) throw new Error('Saved progress has an unexpected shape.')
    return parsed
  } catch (error) {
    console.error('Could not read saved study progress.', error)
    return emptyProgress
  }
}

export function writeProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('Could not save study progress.', error)
  }
}

function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Progress>
  return (
    Array.isArray(candidate.completedTopics) &&
    Array.isArray(candidate.completedModules) &&
    !!candidate.testResults &&
    typeof candidate.testResults === 'object'
  )
}

export function topicKey(subjectId: string, moduleId: string, topicId: string): string {
  return `${subjectId}/${moduleId}/${topicId}`
}

export function moduleKey(subjectId: string, moduleId: string): string {
  return `${subjectId}/${moduleId}`
}

export function moduleTopicCount(subjectId: string, moduleId: string, topics: { id: string }[]): number {
  return topics.filter((topic) => readProgress().completedTopics.includes(topicKey(subjectId, moduleId, topic.id))).length
}
