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

const STORAGE_KEY = 'octarine-tasks'

/**
 * Загружает задачи из localStorage (только для первого запуска или отладки)
 * В production режиме задачи загружаются из файловой системы через TaskRepository
 */
export function loadTasks(): Task[] {
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

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}
