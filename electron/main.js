import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

// В ES-модулях __dirname недоступен, получаем его вручную
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // В режиме разработки загружаем Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools() // Раскомментируй, если нужны DevTools сразу
  } else {
    // В продакшене загружаем собранный файл
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // На macOS приложение и его меню обычно остаются активными, 
  // пока пользователь не завершит их явно через Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // На macOS пересоздаем окно при клике на иконку в доке, если других окон нет
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
