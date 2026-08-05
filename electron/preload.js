const { contextBridge, ipcRenderer } = require('electron')

// Пробрасываем API из main процесса в renderer
contextBridge.exposeInMainWorld('electronAPI', {
  getBaseDir: () => ipcRenderer.invoke('getBaseDir'),
  readDir: (dirPath) => ipcRenderer.invoke('readDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('writeFile', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('deleteFile', filePath),
  getFileMtime: (filePath) => ipcRenderer.invoke('getFileMtime', filePath),
  
  // Подписка на события изменений файлов
  onFileChanged: (callback) => {
    ipcRenderer.on('file-changed', (event, data) => callback(data))
  },
  removeFileChangedListener: () => {
    ipcRenderer.removeAllListeners('file-changed')
  }
})

// Флаг для определения Electron окружения
contextBridge.exposeInMainWorld('__ELECTRON__', true)
