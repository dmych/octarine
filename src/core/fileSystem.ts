import type { Task } from '../storage'

/**
 * Базовый интерфейс для работы с файловой системой
 */
export interface FileSystemAdapter {
  /** Получить базовую папку приложения */
  getBaseDir(): Promise<string>
  
  /** Проверить существование файла */
  exists(filePath: string): Promise<boolean>
  
  /** Прочитать содержимое файла */
  readFile(filePath: string): Promise<string>
  
  /** Записать содержимое в файл */
  writeFile(filePath: string, content: string): Promise<void>
  
  /** Удалить файл */
  deleteFile(filePath: string): Promise<void>
  
  /** Получить список файлов в директории */
  readDir(dirPath: string): Promise<string[]>
  
  /** Начать отслеживание изменений в директории */
  watch?(dirPath: string, callback: (filePath: string) => void): () => void
}

/**
 * Получает базовую директорию Octarine
 * Desktop: ~/Octarine
 * Android: /storage/emulated/0/Octarine (или через Capacitor Filesystem)
 */
export async function getBaseDir(): Promise<string> {
  // Проверка на Electron (desktop)
  if (typeof window !== 'undefined' && (window as any).__ELECTRON__) {
    return await invokeElectronBaseDir()
  }
  
  // Проверка на Android (Capacitor)
  if (typeof window !== 'undefined' && (window as any).capacitorGetFileSystem) {
    return await (window as any).capacitorGetFileSystem()
  }
  
  // Fallback для web-отладки - используем localStorage как хранилище метаданных
  // но файлы не доступны напрямую
  return '/tmp/octarine-debug'
}

async function invokeElectronBaseDir(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.electronAPI) {
      reject(new Error('Electron API not available'))
      return
    }
    window.electronAPI.getBaseDir().then(resolve).catch(reject)
  })
}

/**
 * Проверяет, запущено ли приложение в Electron
 */
export function isElectron(): boolean {
  return typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('electron')
}

/**
 * Проверяет, запущено ли приложение в Capacitor (Android)
 */
export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!(window as any).capacitorGetFileSystem
}
