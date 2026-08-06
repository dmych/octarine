import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // <-- ЭТА СТРОКА КРИТИЧЕСКИ ВАЖНА для Electron
  build: {
    rollupOptions: {
      external: ['@capacitor/filesystem', '@capacitor/device', '@capacitor/app-launcher']
    }
  }
})