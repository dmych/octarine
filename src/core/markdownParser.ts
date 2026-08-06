import * as yaml from 'js-yaml'
import type { Task, DueDate } from '../storage'

export interface TaskFileData {
  id: string
  title: string
  horizon: 'today' | 'week' | 'month' | 'year' | 'none'
  dueDate: string | null
  completed: boolean
}

/**
 * Парсит YAML frontmatter из markdown содержимого
 * Возвращает { data: объект из YAML, content: остальное содержимое }
 */
function parseFrontmatter(content: string): { data: Record<string, any>, content: string } {
  const trimmedContent = content.trim()
  
  // Проверяем наличие frontmatter (начинается с ---)
  if (!trimmedContent.startsWith('---')) {
    return { data: {}, content: trimmedContent }
  }
  
  // Ищем конец frontmatter
  const endMatch = trimmedContent.match(/^---\r?\n([\s\S]*?)^---\r?\n([\s\S]*)$/m)
  
  if (!endMatch) {
    return { data: {}, content: trimmedContent }
  }
  
  const yamlContent = endMatch[1]
  const markdownContent = endMatch[2].trim()
  
  let data: Record<string, any> = {}
  try {
    const parsed = yaml.load(yamlContent)
    if (parsed && typeof parsed === 'object') {
      data = parsed as Record<string, any>
    }
  } catch (e) {
    console.error('[parseFrontmatter] Error parsing YAML:', e)
  }
  
  return { data, content: markdownContent }
}

/**
 * Сериализует данные в YAML frontmatter + markdown содержимое
 */
function stringifyFrontmatter(data: Record<string, any>, content: string): string {
  const yamlStr = yaml.dump(data, {
    lineWidth: -1, // Не переносить длинные строки
    noRefs: true,  // Избегать ссылок
    sortKeys: false // Сохранять порядок ключей
  })
  
  return `---\n${yamlStr}---\n${content}`
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
  const { data, content: markdownContent } = parseFrontmatter(content)
  
  const dueDate = isoDateToDueDate(data.dueDate || null)
  
  return {
    id: data.id || fileId.replace('.md', ''),
    title: data.title || '',
    description: markdownContent.trim(),
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
  
  const content = stringifyFrontmatter(frontMatter, task.description || '')
  return content
}
