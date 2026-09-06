// 빌드 후 dist/sitemap.xml 과 dist/robots.txt 를 만든다.
//
// 정적 경로는 아래 STATIC_ROUTES 에 적혀 있고, 설교·목회칼럼 상세는 Supabase 에서
// id 를 읽어 채운다. 회원 전용 경로(/community/news 등)는 색인 대상이 아니라
// sitemap 에 넣지 않고 robots.txt 로 막는다.
//
// 네트워크가 안 되면 정적 경로만으로 만들되, 종료 코드를 1로 남겨 CI 가
// 알아채게 한다. 그래도 배포 자체를 막지는 않도록 --allow-partial 로
// 넘길 수 있다(예: 오프라인 로컬 빌드).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readEnv() {
  const out = {}
  const file = resolve(root, '.env')
  if (!existsSync(file)) return out
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv(), ...process.env }
const SITE_URL = (env.VITE_SITE_URL || 'https://hmc.hunga-seo.workers.dev').replace(/\/$/, '')
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY

// [경로, 우선순위, 변경주기]
// router 의 실제 경로(src/router/index.ts)와 맞춘다. 없는 경로를 넣거나
// 있는 경로를 빠뜨리면 검색엔진이 헛걸음하거나 새 페이지를 놓친다.
const STATIC_ROUTES = [
  ['/', '1.0', 'weekly'],
  ['/introduction/welcome', '0.8', 'yearly'],
  ['/introduction/greeting', '0.7', 'yearly'],
  ['/introduction/history', '0.5', 'yearly'],
  ['/introduction/staff', '0.6', 'monthly'],
  ['/introduction/worship-guide', '0.8', 'monthly'],
  ['/introduction/directions', '0.7', 'yearly'],
  ['/worship/sunday-sermon', '0.9', 'weekly'],
  ['/worship/pastoral-column', '0.8', 'weekly'],
  ['/worship/church-video', '0.5', 'weekly'],
  ['/education/j-angels', '0.5', 'yearly'],
  ['/education/j-kids', '0.5', 'yearly'],
  ['/education/ja-yu', '0.5', 'yearly'],
  ['/education/youth', '0.5', 'yearly'],
  ['/education/adult', '0.5', 'yearly'],
  ['/community/mission-news', '0.5', 'monthly'],
]

/** 검색엔진에 노출하지 않을 경로. router 의 noindex 와 짝을 맞춘다. */
const DISALLOW = [
  '/community/news', '/community/photos', '/community/bulletin',
  '/login', '/signup', '/profile', '/pending', '/no-access', '/admin',
]

async function rows(table, columns) {
  if (!SUPABASE_URL || !ANON_KEY) throw new Error('.env 에 Supabase 설정이 없다')
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?select=${columns}&limit=5000`
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } })
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const day = v => (v ? String(v).slice(0, 10) : null)

const urls = STATIC_ROUTES.map(([loc, priority, changefreq]) => ({ loc, priority, changefreq }))

try {
  const [sermons, columns] = await Promise.all([
    rows('sermons', 'id,date'),
    rows('pastorColumn', 'id,created_at'),
  ])
  for (const s of sermons) {
    urls.push({ loc: `/worship/sunday-sermon/${s.id}`, priority: '0.6', changefreq: 'yearly', lastmod: day(s.date) })
  }
  for (const c of columns) {
    urls.push({ loc: `/worship/pastoral-column/${c.id}`, priority: '0.6', changefreq: 'yearly', lastmod: day(c.created_at) })
  }
  console.log(`sitemap: 정적 ${STATIC_ROUTES.length} + 설교 ${sermons.length} + 칼럼 ${columns.length}`)
} catch (e) {
  console.warn(`sitemap: 상세 경로를 못 읽어 정적 경로만 넣는다 — ${e.message}`)
  if (!process.argv.includes('--allow-partial')) {
    // 배포 자체는 막지 않는다(dist 파일은 이미 정적 경로로 채워 아래에서 씀).
    // 대신 종료 코드로 CI 가 "이번 배포는 sitemap 이 불완전하다" 를 알게 한다.
    process.exitCode = 1
  }
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => [
    '  <url>',
    `    <loc>${escape(SITE_URL + u.loc)}</loc>`,
    u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
    `    <changefreq>${u.changefreq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')),
  '</urlset>',
  '',
].join('\n')

const robots = [
  'User-agent: *',
  ...DISALLOW.map(p => `Disallow: ${p}`),
  'Allow: /',
  '',
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  '',
].join('\n')

writeFileSync(resolve(root, 'dist/sitemap.xml'), xml)
writeFileSync(resolve(root, 'dist/robots.txt'), robots)
console.log(`sitemap: ${urls.length}개 URL → dist/sitemap.xml, dist/robots.txt`)
