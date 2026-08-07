import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return defineConfig({
    plugins: [react()],
    server: {
      port: Number(env.WEB_PORT || process.env.WEB_PORT || 5174),
      allowedHosts: ['caregiver-flattop-scouting.ngrok-free.dev'],
    },
  })
}
