import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages deployment — change 'ssp-editor' to your repo name
  base: '/ssp-editor/',
})
