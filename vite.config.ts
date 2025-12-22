import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get build information
const getBuildInfo = () => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const buildDate = new Date().toISOString().split('T')[0]
    return { commitHash, buildDate }
  } catch {
    return { commitHash: 'unknown', buildDate: new Date().toISOString().split('T')[0] }
  }
}

const buildInfo = getBuildInfo()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
})
