import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000'
  const apiProxy = {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  }

  return defineConfig({
    plugins: [react()],
    server: {
      port: Number(env.WEB_PORT || process.env.WEB_PORT || 5174),
      strictPort: true,
      allowedHosts: ['caregiver-flattop-scouting.ngrok-free.dev'],
      proxy: apiProxy,
    },
    preview: {
      allowedHosts: ['caregiver-flattop-scouting.ngrok-free.dev'],
      proxy: apiProxy,
    },
  })
}
