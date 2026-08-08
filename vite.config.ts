import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => ({
  // Cloudflare 루트 도메인 배포. GitHub Pages 서브경로('/hmc-vue/')는 폐기했다.
  base: '/',
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 프로덕션 번들에 디버그 로그가 남지 않도록 (이메일 등이 콘솔에 찍히던 원인)
  esbuild: {
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor':   ['vue', 'vue-router', 'pinia'],
          'icons':        ['lucide-vue-next'],
          'supabase':     ['@supabase/supabase-js'],
        },
      },
    },
  },
}))
