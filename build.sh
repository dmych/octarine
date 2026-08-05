#!/bin/bash

# Останавливать выполнение при любой ошибке (кроме явно обработанных)
set -e

echo "Запуск процесса сборки Octarine..."
echo "========================================="

# 1. Проверка, что мы в корне проекта
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Запустите скрипт из корневой папки проекта."
    exit 1
fi

# 2. Установка зависимостей (если папки node_modules нет)
if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей (npm install)..."
    npm install
fi

# 3. Сборка веб-части (Vite)
echo ""
echo "[1/4] Сборка веб-ассетов (Vite)..."
npm run build

# 4. Синхронизация с Capacitor
echo ""
echo "[2/4] Синхронизация с Capacitor..."
npx cap sync android

if [ -d "electron" ]; then
    echo "Синхронизация с Electron..."
    # Игнорируем ошибки, если electron не настроен до конца
    npx cap sync electron || echo "⚠️ Синхронизация Electron пропущена или завершилась с предупреждением"
fi

# 5. Сборка Android APK
echo ""
echo "[3/4] Сборка Android APK (Debug)..."
cd android
./gradlew clean assembleDebug
cd ..
echo "Android APK: android/app/build/outputs/apk/debug/app-debug.apk"

# 6. Сборка Electron (macOS)
echo ""
echo "[4/4] Сборка Electron приложения (macOS)..."

# Определяем, какой скрипт есть в package.json
ELECTRON_SCRIPT=""
if npm run | grep -q "electron:build"; then
    ELECTRON_SCRIPT="electron:build"
elif npm run | grep -q "build:electron"; then
    ELECTRON_SCRIPT="build:electron"
elif npm run | grep -q "electron:mac"; then
    ELECTRON_SCRIPT="electron:mac"
fi

if [ -n "$ELECTRON_SCRIPT" ]; then
    # Запускаем сборку Electron, но не прерываем скрипт при ошибке
    # (electron-builder часто возвращает ненулевой код из-за предупреждений о подписи)
    set +e
    npm run "$ELECTRON_SCRIPT"
    ELECTRON_EXIT=$?
    set -e
    
    if [ $ELECTRON_EXIT -eq 0 ]; then
        echo "Electron: сборка прошла успешно"
    else
        echo "⚠️ Electron: сборка завершилась с кодом $ELECTRON_EXIT"
        echo "   (DMG мог быть создан, проверьте папку dist/ или release/)"
    fi
else
    echo "⚠️ Не удалось найти скрипт сборки Electron в package.json."
    echo "Пожалуйста, запусти сборку Electron вручную."
fi

# 7. Итоговый отчёт
echo ""
echo "========================================="
echo "Сборка Octarine завершена!"
echo ""
echo "Результаты:"
[ -f "android/app/build/outputs/apk/debug/app-debug.apk" ] && echo "  Android APK: android/app/build/outputs/apk/debug/app-debug.apk"
[ -d "dist" ] && find dist release -maxdepth 2 -name "*.dmg" 2>/dev/null | head -1 | xargs -I {} echo "  macOS DMG: {}" 2>/dev/null
echo "========================================="
