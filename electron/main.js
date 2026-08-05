import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow

// Базовая директория Octarine
// Desktop: ~/Octarine
// Android будет использовать Capacitor Filesystem
function getBaseDir() {
  return path.join(os.homedir(), 'Octarine')
}

function ensureBaseDirs() {
  const baseDir = getBaseDir()
  const tasksDir = path.join(baseDir, 'tasks')
  const assetsDir = path.join(baseDir, 'assets')
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true })
  }
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }
  
  return { baseDir, tasksDir, assetsDir }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  ensureBaseDirs()
  createWindow()
  
  // IPC handlers для работы с файлами
  
  ipcMain.handle('getBaseDir', () => {
    return getBaseDir()
  })
  
  ipcMain.handle('readDir', (event, dirPath) => {
    try {
      const files = fs.readdirSync(dirPath)
      return files
    } catch (error) {
      console.error('Error reading directory:', error)
      throw error
    }
  })
  
  ipcMain.handle('readFile', (event, filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  })
  
  ipcMain.handle('writeFile', (event, filePath, content) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
    } catch (error) {
      console.error('Error writing file:', error)
      throw error
    }
  })
  
  ipcMain.handle('deleteFile', (event, filePath) => {
    try {
      fs.unlinkSync(filePath)
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  })
  
  ipcMain.handle('getFileMtime', (event, filePath) => {
    try {
      const stats = fs.statSync(filePath)
      return stats.mtimeMs
    } catch (error) {
      console.error('Error getting file mtime:', error)
      throw error
    }
  })
  
  // Watcher для отслеживания изменений в папке tasks
  const { tasksDir } = ensureBaseDirs()
  const watcher = fs.watch(tasksDir, { persistent: true, recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      // Уведомляем renderer процесс об изменении файла
      if (mainWindow) {
        mainWindow.webContents.send('file-changed', { eventType, filename })
      }
    }
  })
  
  // Очистка watcher при закрытии приложения
  app.on('will-quit', () => {
    watcher.close()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
