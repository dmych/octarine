# Исправление ошибки Capacitor Filesystem

## Проблема
При запуске приложения появлялась ошибка:
```
Uncaught TypeError: Failed to resolve module specifier "@capacitor/filesystem". 
Relative references must start with either "/", "./", or "../".
```

Эта ошибка возникала как в десктопной версии, так и в Android версии (белый экран).

## Причина
Vite пытается статически анализировать все импорты во время сборки. Когда используется обычный `import` для Capacitor модулей, Vite не может разрешить их корректно, потому что:
1. Capacitor модули предназначены для рантайма мобильного приложения
2. В веб-среде эти модули не должны загружаться

## Решение

### 1. Динамический импорт
Используем динамический `import()` внутри функции, которая вызывается только в Capacitor среде:

```typescript
async function loadCapacitorFilesystem() {
  if (!Filesystem && isCapacitor()) {
    try {
      const capacitorFs = await import('@capacitor/filesystem')
      Filesystem = capacitorFs.Filesystem
      Directory = capacitorFs.Directory
      Encoding = capacitorFs.Encoding
    } catch (e) {
      console.error('Failed to load Capacitor Filesystem:', e)
      throw e
    }
  }
  return { Filesystem, Directory, Encoding }
}
```

### 2. Конфигурация Vite
Добавили в `vite.config.ts` секцию `optimizeDeps` для явного указания зависимостей:

```typescript
export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    include: ['@capacitor/filesystem', '@capacitor/device', '@capacitor/app-launcher'],
  },
})
```

## Как это работает
1. Функция `isCapacitor()` проверяет наличие объекта `window.Capacitor`
2. Если приложение запущено не в Capacitor среде, импорт вообще не выполняется
3. В Capacitor среде динамический импорт загружает модули во время выполнения
4. Vite предварительно оптимизирует указанные зависимости для корректной работы

## Примечания
- Для Electron версии используется отдельный API через `window.electronAPI`
- Для веб-версии используется fallback на `localStorage`
- Все импорты Capacitor модулей должны быть динамическими и условными
