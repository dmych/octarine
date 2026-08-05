import matter from 'gray-matter'
import yaml from 'js-yaml'
import type { Task, DueDate } from '../storage'

export interface TaskFileData {
  id: string
  title: string
  horizon: 'today' | 'week' | 'month' | 'year' | 'none'
  dueDate: string | null
  completed: boolean
}

/**
 * Преобразует горизонт в ISO-формат даты
 */
export function horizonToIsoDate(horizon: 'today' | 'week' | 'month' | 'year' | 'none'): string | null {
  const now = new Date()
  
  switch (horizon) {
    case 'today':
      return now.toISOString().split('T')[0] // YYYY-MM-DD
    case 'week': {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}` // YYYY-W99
    }
    case 'month':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
    case 'year':
      return `${now.getFullYear()}` // YYYY
    case 'none':
    default:
      return null
  }
}

/**
 * Преобразует ISO-дату из файла во внутренний формат DueDate
 */
export function isoDateToDueDate(isoDate: string | null): DueDate | null {
  if (!isoDate) return null
  
  // YYYY-MM-DD (день)
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return { type: 'day', value: isoDate }
  }
  
  // YYYY-W99 (неделя)
  if (/^\d{4}-W\d{2}$/.test(isoDate)) {
    return { type: 'week', value: isoDate }
  }
  
  // YYYY-MM (месяц)
  if (/^\d{4}-\d{2}$/.test(isoDate)) {
    return { type: 'month', value: isoDate }
  }
  
  // YYYY (год)
  if (/^\d{4}$/.test(isoDate)) {
    return { type: 'year', value: isoDate }
  }
  
  return null
}

/**
 * Преобразует внутренний формат DueDate в горизонт
 */
export function dueDateToHorizon(dueDate: DueDate | null): 'today' | 'week' | 'month' | 'year' | 'none' {
  if (!dueDate) return 'none'
  
  switch (dueDate.type) {
    case 'day': return 'today'
    case 'week': return 'week'
    case 'month': return 'month'
    case 'year': return 'year'
    default: return 'none'
  }
}

/**
 * Парсит markdown файл с YAML frontmatter в объект Task
 */
export function parseTaskFile(content: string, fileId: string): Task {
  const file = matter(content, {
    engines: {
      yaml: {
        parse: (str: string) => yaml.load(str) as object,
        stringify: (obj: object) => yaml.dump(obj)
      }
    }
  })
  
  const data = file.data as TaskFileData
  const dueDate = isoDateToDueDate(data.dueDate)
  
  return {
    id: data.id || fileId.replace('.md', ''),
    title: data.title,
    description: file.content.trim(),
    dueDate,
    completed: data.completed ?? false,
    children: []
  }
}

/**
 * Сериализует объект Task в markdown строку с YAML frontmatter
 */
export function serializeTaskToFile(task: Task): string {
  const horizon = dueDateToHorizon(task.dueDate)
  const dueDateIso = task.dueDate ? task.dueDate.value : null
  
  const frontMatter: TaskFileData = {
    id: task.id,
    title: task.title,
    horizon,
    dueDate: dueDateIso,
    completed: task.completed
  }
  
  const content = matter.stringify(task.description || '', frontMatter)
  return content
}
