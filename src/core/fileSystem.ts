import { Filesystem, Directory } from '@capacitor/filesystem'
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

// Путь к папке задач в Octarine/tasks (в корне внутренней памяти)
const TASKS_DIR = 'Octarine/tasks'

/**
 * Получает базовую директорию Octarine
 * Desktop: ~/Octarine
 * Android: Octarine (в корне внутренней памяти, через Capacitor Filesystem)
 */
export async function getBaseDir(): Promise<string> {
  // Проверка на Electron (desktop)
  if (typeof window !== 'undefined' && (window as any).__ELECTRON__) {
    return await invokeElectronBaseDir()
  }

  // Проверка на Android (Capacitor)
  if (isCapacitor()) {
    // Для Android используем корень внутренней памяти как базовую директорию
    return 'Octarine'
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
  return typeof window !== 'undefined' && typeof (window as any).Capacitor !== 'undefined'
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
      try {
        const { AppLauncher } = await import('@capacitor/app-launcher')
        await AppLauncher.openUrl({ 
          url: `android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION&package=${encodeURIComponent('com.octarine.app')}` 
        })
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
