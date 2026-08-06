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
 * Конвертирует HTML в Markdown (базовая реализация)
 */
function htmlToMarkdown(html: string): string {
  let md = html

  // Заменяем блочные элементы на переносы строк
  md = md.replace(/<\/p>/g, '\n\n')
  md = md.replace(/<br\s*\/?>/g, '\n')
  md = md.replace(/<\/h[1-6]>/g, '\n\n')

  // Удаляем открывающие теги
  md = md.replace(/<p[^>]*>/g, '')
  md = md.replace(/<h[1-6][^>]*>/g, '')
  md = md.replace(/<br\s*\/?>/g, '')

  // Жирный текст
  md = md.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
  md = md.replace(/<b>(.*?)<\/b>/g, '**$1**')

  // Курсив
  md = md.replace(/<em>(.*?)<\/em>/g, '*$1*')
  md = md.replace(/<i>(.*?)<\/i>/g, '*$1*')

  // Зачеркнутый текст
  md = md.replace(/<s>(.*?)<\/s>/g, '~~$1~~')
  md = md.replace(/<strike>(.*?)<\/strike>/g, '~~$1~~')

  // Код
  md = md.replace(/<code>(.*?)<\/code>/g, '`$1`')

  // Списки
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
  })
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
    let counter = 1
    return content.replace(/<li[^>]*>(.*?)<\/li>/g, () => `${counter++}. $1\n`)
  })

  // Оставшиеся li (если ul/ol уже обработаны)
  md = md.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')

  // Ссылки
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')

  // Изображения
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '![]($1)')

  // Блок цитат
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, (match, content) => {
    return content.split('\n').map(line => `> ${line}`).join('\n')
  })

  // Удаляем оставшиеся теги
  md = md.replace(/<[^>]+>/g, '')

  // Очищаем лишние переносы строк
  md = md.replace(/\n{3,}/g, '\n\n')
  md = md.trim()

  return md
}

/**
 * Конвертирует Markdown в HTML (базовая реализация для редактора)
 */
function markdownToHtml(md: string): string {
  let html = md

  // Экранируем HTML сущности сначала (чтобы не ломать существующий HTML)
  // Но пропускаем уже существующие HTML теги

  // Заголовки
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>')
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>')
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>')
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Жирный текст
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Курсив
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Зачеркнутый текст
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>')

  // Код
  html = html.replace(/`(.*?)`/g, '<code>$1</code>')

  // Нумерованные списки
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>')

  // Маркированные списки
  html = html.replace(/^[-*+] (.*$)/gim, '<li>$1</li>')

  // Обертка списков
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')

  // Переносы строк в параграфы
  const paragraphs = html.split(/\n\n+/)
  html = paragraphs.map(p => {
    p = p.trim()
    if (!p) return ''
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol')) {
      return p
    }
    // Заменяем одиночные переносы на <br>
    p = p.replace(/\n/g, '<br>')
    return `<p>${p}</p>`
  }).join('')

  // Ссылки
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')

  // Изображения
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')

  // Цитаты
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

  return html
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

  // Конвертируем Markdown в HTML для редактора
  const htmlDescription = markdownToHtml(markdownContent)
  
  return {
    id: data.id || fileId.replace('.md', ''),
    title: data.title || '',
    description: htmlDescription,
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
  
  // Конвертируем HTML в Markdown перед сохранением
  const markdownContent = htmlToMarkdown(task.description || '')

  const content = stringifyFrontmatter(frontMatter, markdownContent)
  return content
}
