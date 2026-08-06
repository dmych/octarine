export interface Task {
  id: string
  title: string
  description: string
  dueDate: DueDate | null
  completed: boolean
  children: Task[]
}

export type DueDate = {
  type: 'day' | 'week' | 'month' | 'year'
  value: string
}

// Пустой интерфейс для window.electronAPI будет расширен в preload скрипте
declare global {
  interface Window {
    electronAPI?: {
      getBaseDir: () => Promise<string>
      readDir: (dirPath: string) => Promise<string[]>
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<void>
      deleteFile: (filePath: string) => Promise<void>
      getFileMtime: (filePath: string) => Promise<number>
      onFileChanged: (callback: (data: { eventType: string, filename: string }) => void) => void
      removeFileChangedListener: () => void
    }
    __ELECTRON__?: boolean
    capacitorGetFileSystem?: () => Promise<string>
  }
}

// Динамический импорт Capacitor модулей для избежания ошибок сборки Vite
let Filesystem: any = null
let Directory: any = null
let Encoding: any = null

async function loadCapacitorFilesystem() {
  if (!Filesystem && isCapacitor()) {
    // Используем Function constructor для избежания статического анализа Vite
    const importFn = new Function('module', 'return import(module)')
    const capacitorFs = await importFn('@capacitor/filesystem')
    Filesystem = capacitorFs.Filesystem
    Directory = capacitorFs.Directory
    Encoding = capacitorFs.Encoding
  }
  return { Filesystem, Directory, Encoding }
}

const STORAGE_KEY = 'octarine-tasks'
const TASKS_DIR = 'Octarine/tasks'

/**
 * Проверяет, работает ли приложение в среде Capacitor (Android/iOS)
 */
function isCapacitor(): boolean {
  return typeof (window as any).Capacitor !== 'undefined'
}

/**
 * Проверяет, работает ли приложение в среде Electron
 */
function isElectron(): boolean {
  return !!(window as any).__ELECTRON__
}

/**
 * Загружает задачи из файловой системы (Capacitor для Android, Electron для десктопа)
 * или из localStorage (для веб-версии и первого запуска)
 */
export async function loadTasks(): Promise<Task[]> {
  // Для Electron используем electronAPI
  if (isElectron() && window.electronAPI) {
    try {
      const baseDir = await window.electronAPI.getBaseDir()
      const tasksDir = `${baseDir}/Obsidian/tasks`
      
      // Читаем все файлы задач
      const files = await window.electronAPI.readDir(tasksDir)
      const tasks: Task[] = []
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await window.electronAPI.readFile(`${tasksDir}/${file}`)
          const task = parseMarkdownTask(content)
          if (task) {
            tasks.push(task)
          }
        }
      }
      
      return sortTasks(tasks)
    } catch (error) {
      console.error('Error loading tasks from Electron filesystem:', error)
      // Fallback to localStorage
      return loadTasksFromLocalStorage()
    }
  }
  
  // Для Capacitor (Android) используем Filesystem API
  if (isCapacitor()) {
    try {
      const { Filesystem, Directory, Encoding } = await loadCapacitorFilesystem()
      
      // Проверяем существование директории и создаем если нет
      try {
        await Filesystem.checkDir({
          path: TASKS_DIR,
          directory: Directory.External
        })
      } catch {
        // Директория не существует, создаем её
        await Filesystem.mkdir({
          path: TASKS_DIR,
          directory: Directory.External,
          recursive: true
        })
      }
      
      // Читаем список файлов в директории
      const result = await Filesystem.readdir({
        path: TASKS_DIR,
        directory: Directory.External
      })
      
      const tasks: Task[] = []
      
      for (const entry of result.files) {
        if (entry.name.endsWith('.md')) {
          try {
            const fileContent = await Filesystem.readFile({
              path: `${TASKS_DIR}/${entry.name}`,
              directory: Directory.External,
              encoding: Encoding.UTF8
            })
            
            const task = parseMarkdownTask(fileContent.data as string)
            if (task) {
              tasks.push(task)
            }
          } catch (error) {
            console.error(`Error reading file ${entry.name}:`, error)
          }
        }
      }
      
      return sortTasks(tasks)
    } catch (error) {
      console.error('Error loading tasks from Capacitor filesystem:', error)
      // Fallback to localStorage
      return loadTasksFromLocalStorage()
    }
  }
  
  // Для веб-версии используем localStorage
  return loadTasksFromLocalStorage()
}

/**
 * Загружает задачи из localStorage (fallback вариант)
 */
function loadTasksFromLocalStorage(): Task[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const today = new Date().toISOString().split('T')[0]
    return [
      {
        id: '1',
        title: 'Задача на сегодня',
        description: '<p>Описание задачи на сегодня</p>',
        dueDate: { type: 'day', value: today },
        completed: false,
        children: [],
      },
      {
        id: '2',
        title: 'Задача на неделю',
        description: '<p>Описание задачи на эту неделю</p>',
        dueDate: { type: 'week', value: '2026-W31' },
        completed: false,
        children: [
          {
            id: '2-1',
            title: 'Подзадача без срока',
            description: '<p>Описание подзадачи</p>',
            dueDate: null,
            completed: false,
            children: [],
          },
        ],
      },
      {
        id: '3',
        title: 'Задача без горизонта',
        description: '<p>Эта задача не имеет срока выполнения</p>',
        dueDate: null,
        completed: false,
        children: [],
      },
    ]
  }
  return JSON.parse(raw)
}

/**
 * Сохраняет задачи в файловую систему (Capacitor для Android, Electron для десктопа)
 * или в localStorage (для веб-версии)
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  // Для Electron используем electronAPI
  if (isElectron() && window.electronAPI) {
    try {
      const baseDir = await window.electronAPI.getBaseDir()
      const tasksDir = `${baseDir}/Obsidian/tasks`
      
      // Сохраняем каждую задачу в отдельный файл
      for (const task of tasks) {
        const fileName = `${task.id}.md`
        const content = taskToMarkdown(task)
        await window.electronAPI.writeFile(`${tasksDir}/${fileName}`, content)
      }
      return
    } catch (error) {
      console.error('Error saving tasks to Electron filesystem:', error)
    }
  }
  
  // Для Capacitor (Android) используем Filesystem API
  if (isCapacitor()) {
    try {
      const { Filesystem, Directory, Encoding } = await loadCapacitorFilesystem()
      
      // Сохраняем каждую задачу в отдельный файл
      for (const task of tasks) {
        const fileName = `${task.id}.md`
        const content = taskToMarkdown(task)
        
        await Filesystem.writeFile({
          path: `${TASKS_DIR}/${fileName}`,
          directory: Directory.External,
          data: content,
          encoding: Encoding.UTF8
        })
      }
      return
    } catch (error) {
      console.error('Error saving tasks to Capacitor filesystem:', error)
    }
  }
  
  // Для веб-версии используем localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

/**
 * Преобразует задачу в Markdown формат
 */
function taskToMarkdown(task: Task): string {
  let md = `---\n`
  md += `id: ${task.id}\n`
  md += `title: ${task.title.replace(/\n/g, ' ')}\n`
  md += `completed: ${task.completed}\n`
  
  if (task.dueDate) {
    md += `dueDate:\n`
    md += `  type: ${task.dueDate.type}\n`
    md += `  value: ${task.dueDate.value}\n`
  } else {
    md += `dueDate: null\n`
  }
  
  md += `---\n\n`
  md += task.description
  
  // Добавляем подзадачи
  if (task.children && task.children.length > 0) {
    md += `\n\n## Subtasks\n\n`
    for (const child of task.children) {
      md += `- [${child.completed ? 'x' : ' '}] ${child.title}\n`
    }
  }
  
  return md
}

/**
 * Парсит Markdown файл в задачу
 */
function parseMarkdownTask(content: string): Task | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!frontmatterMatch) {
    return null
  }
  
  const frontmatter = frontmatterMatch[1]
  const description = frontmatterMatch[2].trim()
  
  const id = extractYamlValue(frontmatter, 'id') || ''
  const title = extractYamlValue(frontmatter, 'title') || ''
  const completed = extractYamlValue(frontmatter, 'completed') === 'true'
  
  let dueDate: DueDate | null = null
  const dueDateMatch = frontmatter.match(/dueDate:\s*\n?\s*type:\s*(\w+)\s*\n?\s*value:\s*([\w-]+)/)
  if (dueDateMatch) {
    dueDate = {
      type: dueDateMatch[1] as 'day' | 'week' | 'month' | 'year',
      value: dueDateMatch[2]
    }
  } else if (extractYamlValue(frontmatter, 'dueDate') !== 'null') {
    const dueDateSimple = extractYamlValue(frontmatter, 'dueDate')
    if (dueDateSimple) {
      // Простой формат даты
      dueDate = {
        type: 'day',
        value: dueDateSimple
      }
    }
  }
  
  // Парсим подзадачи
  const children: Task[] = []
  const subtasksMatch = description.match(/## Subtasks\n\n([\s\S]*)/)
  if (subtasksMatch) {
    const subtasksText = subtasksMatch[1]
    const subtaskLines = subtasksText.split('\n').filter(line => line.trim().startsWith('- ['))
    
    for (const line of subtaskLines) {
      const match = line.match(/- \[(x| )\]\s+(.+)/)
      if (match) {
        children.push({
          id: `${id}-${children.length + 1}`,
          title: match[2],
          description: '',
          dueDate: null,
          completed: match[1] === 'x',
          children: []
        })
      }
    }
  }
  
  // Удаляем секцию подзадач из описания
  const cleanDescription = description.replace(/\n\n## Subtasks\n\n[\s\S]*/, '')
  
  return {
    id,
    title,
    description: cleanDescription,
    dueDate,
    completed,
    children
  }
}

/**
 * Извлекает значение из YAML frontmatter
 */
function extractYamlValue(frontmatter: string, key: string): string | null {
  const regex = new RegExp(`${key}:\\s*([^\\n]+)`)
  const match = frontmatter.match(regex)
  return match ? match[1].trim() : null
}

/**
 * Сортирует задачи по горизонтам
 */
function sortTasks(tasks: Task[]): Task[] {
  const horizonOrder: Record<string, number> = {
    'day': 0,
    'week': 1,
    'month': 2,
    'year': 3,
    'null': 4
  }
  
  return tasks.sort((a, b) => {
    const aHorizon = a.dueDate ? a.dueDate.type : 'null'
    const bHorizon = b.dueDate ? b.dueDate.type : 'null'
    return (horizonOrder[aHorizon] ?? 4) - (horizonOrder[bHorizon] ?? 4)
  })
}

/**
 * Запрашивает разрешение на доступ к файловой системе (для Android)
 * Должно вызываться при первом запуске приложения
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (!isCapacitor()) {
    return true
  }
  
  try {
    // Для Android 11+ (API 30+) требуется MANAGE_EXTERNAL_STORAGE
    // Для более ранних версий достаточно READ/WRITE_EXTERNAL_STORAGE
    const { Device } = await import('@capacitor/device')
    const info = await Device.getInfo()
    
    if (info.platform !== 'android') {
      return true
    }
    
    // Проверяем версию Android
    const { version } = await Device.getInfo()
    const apiLevel = parseInt(version.split('.')[0] || '0')
    
    if (apiLevel >= 30) {
      // Android 11+: открываем настройки для предоставления доступа
      const { AppLauncher } = await import('@capacitor/app-launcher')
      
      try {
        await AppLauncher.canOpenUrl({ url: 'package:com.octarine.app' })
        // Отправляем пользователя в настройки для предоставления MANAGE_EXTERNAL_STORAGE
        const intentUrl = `package:com.octarine.app`
        await AppLauncher.openUrl({ url: `android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION&package=${encodeURIComponent('com.octarine.app')}` })
        return true
      } catch {
        // Если не удалось открыть настройки, пробуем альтернативный способ
        window.location.href = `package:com.octarine.app`
        return true
      }
    } else {
      // Android < 11: запрашиваем классические разрешения
      // Разрешения уже должны быть запрошены через Manifest
      return true
    }
  } catch (error) {
    console.error('Error requesting storage permission:', error)
    return false
  }
}
