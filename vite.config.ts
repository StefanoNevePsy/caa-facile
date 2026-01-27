import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@xenova/transformers': '@xenova/transformers/dist/transformers.js',
    },
  },
})