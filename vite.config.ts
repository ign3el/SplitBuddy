import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get build information
const getBuildInfo = () => {
  const buildDate = new Date().toISOString().split('T')[0]
  // Prefer COMMIT_SHA from environment (works in Docker/CI), fallback to git
  const fromEnv = process.env.COMMIT_SHA
  if (fromEnv && fromEnv.trim().length > 0) {
    return { commitHash: fromEnv.trim(), buildDate }
  }
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    return { commitHash, buildDate }
  } catch {
    return { commitHash: 'unknown', buildDate }
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
