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
 * Динамически загружает Capacitor Filesystem только когда это необходимо
 */
async function getCapacitorFilesystem() {
  if (!isCapacitor()) {
    return null
  }
  
  // Используем Function constructor для избежания статического анализа Vite
  const importFn = new Function('module', 'return import(module)')
  const capacitorFs = await importFn('@capacitor/filesystem')
  return {
    Filesystem: capacitorFs.Filesystem,
    Directory: capacitorFs.Directory,
    Encoding: capacitorFs.Encoding
  }
}

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
    // Папка Octarine будет создана при первой записи файла
    return 'Octarine'
  }

  // Fallback для web-отладки - используем localStorage как хранилище метаданных
  // но файлы не доступны напрямую
  return '/tmp/octarine-debug'
}

/**
 * Создает базовую директорию Octarine и поддиректорию tasks если они не существуют
 * Должно вызываться при инициализации приложения на Android
 */
export async function ensureBaseDirectories(): Promise<void> {
  if (!isCapacitor()) {
    return
  }

  try {
    const importFn = new Function('module', 'return import(module)')
    const capacitorFs = await importFn('@capacitor/filesystem')
    const { Filesystem, Directory } = capacitorFs

    // Создаем директорию Octarine/tasks если она не существует
    try {
      await Filesystem.mkdir({
        path: 'Octarine/tasks',
        directory: Directory.External,
        recursive: true
      })
      console.log('[FileSystem] Created Octarine/tasks directory')
    } catch (e: any) {
      // Директория уже существует
      if (e.message?.includes('exists')) {
        console.log('[FileSystem] Octarine/tasks directory already exists')
      } else {
        console.error('[FileSystem] Error creating directory:', e)
      }
    }
  } catch (error) {
    console.error('[FileSystem] Error ensuring base directories:', error)
  }
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
    
    // Используем Function constructor для избежания статического анализа Vite
    const importFn = new Function('module', 'return import(module)')
    const capacitorDevice = await importFn('@capacitor/device')
    const Device = capacitorDevice.Device
    const info = await Device.getInfo()

    if (info.platform !== 'android') {
      return true
    }

    // Проверяем версию Android
    const { version } = await Device.getInfo()
    const apiLevel = parseInt(version.split('.')[0] || '0')

    if (apiLevel >= 30) {
      // Android 11+: проверяем, есть ли уже разрешение MANAGE_EXTERNAL_STORAGE
      const { Environment } = await importFn('@capacitor/filesystem')
      const isManaged = await Environment.checkPermissions ? 
        await Environment.checkPermissions() : null
      
      if (!isManaged || !isManaged.manageExternalStorage) {
        // Открываем настройки для предоставления MANAGE_EXTERNAL_STORAGE
        // Правильный формат intent для Android
        try {
          const capacitorAppLauncher = await importFn('@capacitor/app-launcher')
          const AppLauncher = capacitorAppLauncher.AppLauncher
          
          // Пробуем открыть настройки управления всеми файлами
          await AppLauncher.openUrl({ 
            url: `android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION` 
          })
        } catch (e) {
          console.log('Could not open MANAGE settings, trying alternative...')
          // Альтернативный способ - открываем настройки приложения
          try {
            const capacitorAppLauncher = await importFn('@capacitor/app-launcher')
            const AppLauncher = capacitorAppLauncher.AppLauncher
            await AppLauncher.openUrl({ 
              url: `package:com.octarine.app` 
            })
          } catch (e2) {
            console.error('Failed to open settings:', e2)
            // Последний вариант - используем window.location
            window.location.href = 'package:com.octarine.app'
          }
        }
      }
      return true
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
