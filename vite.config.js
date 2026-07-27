import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // relative base path for GitHub Pages deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
