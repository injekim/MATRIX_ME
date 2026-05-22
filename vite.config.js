import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/MATRIX_ME/',
  plugins: [react()],
})
