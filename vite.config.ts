import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  /*
    process.env 만 보면 .env 파일 값이 들어오지 않는다(vite 는 .env 를
    직접 읽어 import.meta.env 에만 꽂아 주고, Node 의 process.env 는 건드리지
    않는다). loadEnv 로 같은 값을 config 단계에서도 읽는다.
    third arg('') 는 VITE_ 접두어 없는 값도 포함해 시스템 환경변수까지 본다 —
    Cloudflare Pages 빌드 환경변수는 접두어 없이 올 수도 있어서다.
  */
  const env = loadEnv(mode, process.cwd(), '')

  // 사이트 정식 주소. 커스텀 도메인을 붙이면 여기(또는 VITE_SITE_URL)만 고치면
  // index.html 의 og/canonical, src/lib/seo.ts, sitemap 이 함께 따라간다.
  const siteUrl = env.VITE_SITE_URL
  if (command === 'build' && !siteUrl) {
    throw new Error('VITE_SITE_URL 이 설정되지 않았습니다. .env 에 배포 주소(예: VITE_SITE_URL=https://hmc.hunga-seo.workers.dev)를 추가해 주세요.')
  }
  const SITE_URL = (siteUrl || 'http://localhost:5173').replace(/\/$/, '')

  return {
    // Cloudflare 루트 도메인 배포. GitHub Pages 서브경로('/hmc-vue/')는 폐기했다.
    base: '/',
    define: {
      'import.meta.env.VITE_SITE_URL': JSON.stringify(SITE_URL),
    },
    plugins: [
      vue(),
      tailwindcss(),
      {
        name: 'html-site-url',
        transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', SITE_URL),
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // 프로덕션 번들에서 log/debug 만 지운다. warn/error 까지 지우면 실제
    // 운영 중 발생하는 오류를 콘솔에서 확인할 방법이 없어진다.
    esbuild: {
      pure: command === 'build' ? ['console.log', 'console.debug'] : [],
      drop: command === 'build' ? ['debugger'] : [],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor':   ['vue', 'vue-router'],
            'icons':        ['lucide-vue-next'],
            'supabase':     ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
