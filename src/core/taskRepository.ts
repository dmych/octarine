import type { Task } from '../storage'
import { parseTaskFile, serializeTaskToFile } from './markdownParser'
import { getBaseDir, isElectron, isCapacitor } from './fileSystem'

/**
 * Репозиторий для управления задачами через файловую систему
 */
export class TaskRepository {
  private baseDir: string | null = null
  private tasksCache: Map<string, Task> = new Map()
  private fileMtimes: Map<string, number> = new Map()
  private watchInterval: NodeJS.Timeout | null = null
  private onChangeCallbacks: Array<(tasks: Task[]) => void> = []

  /**
   * Инициализация репозитория
   */
  async init(): Promise<void> {
    try {
      this.baseDir = await getBaseDir()
      console.log('[TaskRepository] Base directory:', this.baseDir)
      
      // Загружаем все задачи из файлов
      await this.loadAllTasks()
      
      // Начинаем отслеживание изменений (только для Electron)
      if (isElectron()) {
        this.startWatching()
      } else {
        // Для Android/Capacitor - периодическая проверка
        this.watchInterval = setInterval(() => {
          this.checkForChanges()
        }, 5000) // Проверка каждые 5 секунд
      }
    } catch (error) {
      console.error('[TaskRepository] Initialization error:', error)
      throw error
    }
  }

  /**
   * Загружает все задачи из папки tasks
   */
  async loadAllTasks(): Promise<void> {
    if (!this.baseDir) return
    
    const tasksDir = `${this.baseDir}/tasks`
    
    try {
      const files = await this.readTasksDir(tasksDir)
      const tasks = new Map<string, Task>()
      
      for (const fileName of files) {
        if (fileName.endsWith('.md')) {
          const filePath = `${tasksDir}/${fileName}`
          try {
            const content = await this.readFile(filePath)
            const task = parseTaskFile(content, fileName)
            tasks.set(task.id, task)
            
            // Сохраняем время модификации файла
            const mtime = await this.getFileMtime(filePath)
            this.fileMtimes.set(fileName, mtime)
          } catch (error) {
            console.error(`[TaskRepository] Error reading file ${fileName}:`, error)
          }
        }
      }
      
      this.tasksCache = tasks
      this.notifyChange()
    } catch (error) {
      console.error('[TaskRepository] Error loading tasks:', error)
    }
  }

  /**
   * Читает директорию задач
   */
  private async readTasksDir(dirPath: string): Promise<string[]> {
    if (isElectron()) {
      return await this.invokeElectronReadDir(dirPath)
    }
    
    // Для Android/Capacitor используем Capacitor Filesystem API
    if (isCapacitor()) {
      return await this.invokeCapacitorReadDir(dirPath)
    }
    
    // Для web-отладки возвращаем пустой массив
    return []
  }

  /**
   * Читает файл
   */
  private async readFile(filePath: string): Promise<string> {
    if (isElectron()) {
      return await this.invokeElectronReadFile(filePath)
    }
    
    // Для Android/Capacitor используем Capacitor Filesystem API
    if (isCapacitor()) {
      return await this.invokeCapacitorReadFile(filePath)
    }
    
    // Для web-отладки
    return ''
  }

  /**
   * Записывает файл
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    if (isElectron()) {
      await this.invokeElectronWriteFile(filePath, content)
      return
    }
    
    // Для Android/Capacitor используем Capacitor Filesystem API
    if (isCapacitor()) {
      await this.invokeCapacitorWriteFile(filePath, content)
      return
    }
    
    // Для web-отладки
    console.log('[TaskRepository] Would write to:', filePath)
  }

  /**
   * Удаляет файл
   */
  private async deleteFile(filePath: string): Promise<void> {
    if (isElectron()) {
      await this.invokeElectronDeleteFile(filePath)
      return
    }
    
    // Для Android/Capacitor используем Capacitor Filesystem API
    if (isCapacitor()) {
      await this.invokeCapacitorDeleteFile(filePath)
      return
    }
    
    // Для web-отладки
    console.log('[TaskRepository] Would delete:', filePath)
  }

  /**
   * Получает время модификации файла
   */
  private async getFileMtime(filePath: string): Promise<number> {
    if (isElectron()) {
      return await this.invokeElectronGetMtime(filePath)
    }
    return Date.now()
  }

  /**
   * Проверяет изменения в файлах
   */
  async checkForChanges(): Promise<void> {
    if (!this.baseDir) return
    
    const tasksDir = `${this.baseDir}/tasks`
    
    try {
      const files = await this.readTasksDir(tasksDir)
      const currentFiles = new Set<string>()
      let hasChanges = false
      
      // Проверяем существующие и новые файлы
      for (const fileName of files) {
        if (fileName.endsWith('.md')) {
          currentFiles.add(fileName)
          const filePath = `${tasksDir}/${fileName}`
          const mtime = await this.getFileMtime(filePath)
          const cachedMtime = this.fileMtimes.get(fileName)
          
          if (mtime !== cachedMtime) {
            // Файл изменен или новый
            try {
              const content = await this.readFile(filePath)
              const task = parseTaskFile(content, fileName)
              this.tasksCache.set(task.id, task)
              this.fileMtimes.set(fileName, mtime)
              hasChanges = true
            } catch (error) {
              console.error(`[TaskRepository] Error re-reading file ${fileName}:`, error)
            }
          }
        }
      }
      
      // Проверяем удаленные файлы
      for (const [fileName, _] of this.fileMtimes) {
        if (!currentFiles.has(fileName)) {
          const taskId = fileName.replace('.md', '')
          this.tasksCache.delete(taskId)
          this.fileMtimes.delete(fileName)
          hasChanges = true
        }
      }
      
      if (hasChanges) {
        this.notifyChange()
      }
    } catch (error) {
      console.error('[TaskRepository] Error checking for changes:', error)
    }
  }

  /**
   * Начинает отслеживание изменений
   */
  private startWatching(): void {
    // В Electron используем fs.watch через IPC
    if (window.electronAPI?.onFileChanged) {
      window.electronAPI.onFileChanged((data: { eventType: string, filename: string }) => {
        console.log('[TaskRepository] File changed:', data)
        this.checkForChanges()
      })
    }
    console.log('[TaskRepository] Started watching for file changes')
  }

  /**
   * Подписка на изменения
   */
  subscribe(callback: (tasks: Task[]) => void): () => void {
    this.onChangeCallbacks.push(callback)
    return () => {
      const index = this.onChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.onChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Уведомляет подписчиков об изменениях
   */
  private notifyChange(): void {
    const tasks = Array.from(this.tasksCache.values())
    this.onChangeCallbacks.forEach(cb => cb(tasks))
  }

  /**
   * Получает все задачи
   */
  getTasks(): Task[] {
    return Array.from(this.tasksCache.values())
  }

  /**
   * Сохраняет задачу в файл
   */
  async saveTask(task: Task): Promise<void> {
    if (!this.baseDir) return
    
    const fileName = `${task.id}.md`
    const filePath = `${this.baseDir}/tasks/${fileName}`
    const content = serializeTaskToFile(task)
    
    try {
      await this.writeFile(filePath, content)
      
      // Обновляем кэш
      this.tasksCache.set(task.id, task)
      const mtime = await this.getFileMtime(filePath)
      this.fileMtimes.set(fileName, mtime)
      
      this.notifyChange()
    } catch (error) {
      console.error('[TaskRepository] Error saving task:', error)
      throw error
    }
  }

  /**
   * Удаляет задачу
   */
  async deleteTask(taskId: string): Promise<void> {
    if (!this.baseDir) return
    
    const fileName = `${taskId}.md`
    const filePath = `${this.baseDir}/tasks/${fileName}`
    
    try {
      await this.deleteFile(filePath)
      
      // Удаляем из кэша
      this.tasksCache.delete(taskId)
      this.fileMtimes.delete(fileName)
      
      this.notifyChange()
    } catch (error) {
      console.error('[TaskRepository] Error deleting task:', error)
      throw error
    }
  }

  // --- Electron IPC методы ---

  private async invokeElectronReadDir(dirPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!window.electronAPI) {
        reject(new Error('Electron API not available'))
        return
      }
      window.electronAPI.readDir(dirPath).then(resolve).catch(reject)
    })
  }

  private async invokeElectronReadFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.electronAPI) {
        reject(new Error('Electron API not available'))
        return
      }
      window.electronAPI.readFile(filePath).then(resolve).catch(reject)
    })
  }

  private async invokeElectronWriteFile(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.electronAPI) {
        reject(new Error('Electron API not available'))
        return
      }
      window.electronAPI.writeFile(filePath, content).then(resolve).catch(reject)
    })
  }

  private async invokeElectronDeleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.electronAPI) {
        reject(new Error('Electron API not available'))
        return
      }
      window.electronAPI.deleteFile(filePath).then(resolve).catch(reject)
    })
  }

  private async invokeElectronGetMtime(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!window.electronAPI) {
        reject(new Error('Electron API not available'))
        return
      }
      window.electronAPI.getFileMtime(filePath).then(resolve).catch(reject)
    })
  }

  // --- Capacitor Filesystem методы ---

  private async invokeCapacitorReadDir(dirPath: string): Promise<string[]> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    
    try {
      const result = await Filesystem.readdir({
        path: dirPath.replace(this.baseDir!, ''),
        directory: Directory.Data
      })
      return result.files.map(f => f.name)
    } catch (error) {
      console.error('[Capacitor] Error reading directory:', error)
      return []
    }
  }

  private async invokeCapacitorReadFile(filePath: string): Promise<string> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    
    try {
      const result = await Filesystem.readFile({
        path: filePath.replace(this.baseDir!, ''),
        directory: Directory.Data,
        encoding: 'utf8'
      })
      return result.data as string
    } catch (error) {
      console.error('[Capacitor] Error reading file:', error)
      throw error
    }
  }

  private async invokeCapacitorWriteFile(filePath: string, content: string): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    
    try {
      // Создаем директорию tasks если она не существует
      const tasksDir = `${this.baseDir}/tasks`
      try {
        await Filesystem.mkdir({
          path: 'tasks',
          directory: Directory.Data,
          recursive: true
        })
      } catch (e) {
        // Директория уже существует
      }
      
      await Filesystem.writeFile({
        path: filePath.replace(this.baseDir!, ''),
        data: content,
        directory: Directory.Data,
        recursive: true
      })
    } catch (error) {
      console.error('[Capacitor] Error writing file:', error)
      throw error
    }
  }

  private async invokeCapacitorDeleteFile(filePath: string): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    
    try {
      await Filesystem.deleteFile({
        path: filePath.replace(this.baseDir!, ''),
        directory: Directory.Data
      })
    } catch (error) {
      console.error('[Capacitor] Error deleting file:', error)
      throw error
    }
  }
}

// Экспорт единственного экземпляра
export const taskRepository = new TaskRepository()
