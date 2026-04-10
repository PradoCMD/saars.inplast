import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_API_PROXY_TARGET = 'http://127.0.0.1:8765'

function normalizeProxyTarget(value) {
  return String(value || DEFAULT_API_PROXY_TARGET).trim().replace(/\/+$/, '') || DEFAULT_API_PROXY_TARGET
}

function buildProxyTargetFromPort(port) {
  const normalizedPort = String(port || '').trim()
  if (!normalizedPort) return ''
  return `http://127.0.0.1:${normalizedPort}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = normalizeProxyTarget(
    env.VITE_API_PROXY_TARGET ||
    process.env.VITE_API_PROXY_TARGET ||
    env.PCP_API_PROXY_TARGET ||
    process.env.PCP_API_PROXY_TARGET ||
    buildProxyTargetFromPort(env.PCP_PORT || process.env.PCP_PORT),
  )

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
