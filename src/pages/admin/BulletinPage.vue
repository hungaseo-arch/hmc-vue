<template>
  <TheLayout>
    <PageHeader title="주보보기" subtitle="이번 주 주보를 확인하세요" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>

        <div v-else-if="bulletinGroups.length === 0" class="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-semibold mb-3">주보 준비 중</h3>
          <p class="text-muted-foreground">주보가 곧 업로드될 예정입니다.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(group, i) in bulletinGroups"
            :key="group.date"
            class="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.08}s` }"
            @click="goToDetail(group.date)"
          >
            <div
              class="relative h-48 overflow-hidden flex items-center justify-center transition-all duration-300"
              :style="{ background: getThumbnailBg(group.date) }"
            >
              <span class="text-lg font-semibold text-slate-500 group-hover:text-slate-700 transition-colors duration-300">주보 보기</span>
            </div>
            <div class="p-5 flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText class="w-4 h-4 text-primary" />
              </div>
              <div class="min-w-0">
                <h3 class="font-semibold text-sm truncate">{{ group.label }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">{{ group.pageCount }}페이지</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FileText } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'

interface BulletinGroup {
  date: string       // e.g. "20160911"
  label: string      // e.g. "2016년 9월 11일"
  thumbnailUrl: string
  pageCount: number
}

const router = useRouter()
const bulletinGroups = ref<BulletinGroup[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const BUCKET = 'weeklyBulletin'

function formatDateLabel(date: string): string {
  // date: "20160911"
  const year = date.slice(0, 4)
  const month = String(parseInt(date.slice(4, 6)))
  const day = String(parseInt(date.slice(6, 8)))
  return `${year}년 ${month}월 ${day}일`
}

onMounted(async () => {
  const { data: files, error: err } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } })

  if (err) {
    error.value = `[Storage 에러] ${err.message}`
    loading.value = false
    return
  }

  if (!files || files.length === 0) {
    error.value = '파일 목록이 비어있습니다. 버킷명 또는 정책을 확인하세요.'
    loading.value = false
    return
  }

  // Group files by date prefix (YYYYMMDD)
  const groups: Record<string, string[]> = {}
  for (const file of files ?? []) {
    const match = file.name.match(/^(\d{8})-/)
    if (match) {
      const date = match[1]
      if (!groups[date]) groups[date] = []
      groups[date].push(file.name)
    }
  }

  // Sort dates descending and build BulletinGroup[]
  bulletinGroups.value = Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, fileNames]) => {
      const thumbnail = fileNames.find(f => f.includes('-p01.')) ?? fileNames[0]
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(thumbnail)
      return {
        date,
        label: formatDateLabel(date),
        thumbnailUrl: urlData.publicUrl,
        pageCount: fileNames.length,
      }
    })

  loading.value = false
})

function goToDetail(date: string) {
  router.push(`/admin/bulletin/${date}`)
}

// 36 컬러 팔레트 — Light Tone(시작) + Accent/일반(끝) 월별 고정 쌍
// Light Tone: Lime100 Green100 Emerald100 Cyan100 Blue100 Purple100
// Accent:     Lime400 Emerald500 Cyan400 Sky500 Blue400 Violet500
// Green:      Lime300 Lime500 Green400 Green600 Emerald400 Emerald600
// Blue:       Cyan300 Cyan500 Sky400 Sky600 Blue500 Blue700
// Purple:     Indigo400 Indigo600 Violet400 Violet600 Purple500 Purple700
// Dark Tone:  Lime800 Green800 Emerald800 Cyan800 Blue800 Purple800

// 월(1~12)별 그라디언트 쌍 [시작색, 끝색]
const MONTH_GRADIENTS: [string, string][] = [
  ['#ecfccb', '#a3e635'],  //  1월 Lime100   → Lime400
  ['#dcfce7', '#10b981'],  //  2월 Green100  → Emerald500
  ['#d1fae5', '#22d3ee'],  //  3월 Emerald100→ Cyan400
  ['#cffafe', '#0ea5e9'],  //  4월 Cyan100   → Sky500
  ['#dbeafe', '#60a5fa'],  //  5월 Blue100   → Blue400
  ['#f3e8ff', '#8b5cf6'],  //  6월 Purple100 → Violet500
  ['#ecfccb', '#4ade80'],  //  7월 Lime100   → Green400
  ['#d1fae5', '#34d399'],  //  8월 Emerald100→ Emerald400
  ['#cffafe', '#67e8f9'],  //  9월 Cyan100   → Cyan300
  ['#dbeafe', '#38bdf8'],  // 10월 Blue100   → Sky400
  ['#f3e8ff', '#818cf8'],  // 11월 Purple100 → Indigo400
  ['#dcfce7', '#bef264'],  // 12월 Green100  → Lime300
]

// 연도별 그라디언트 각도 변화 (6가지 순환)
const YEAR_ANGLES = [135, 150, 120, 160, 110, 145]

function getThumbnailBg(date: string): string {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(4, 6)) - 1  // 0-indexed
  const [start, end] = MONTH_GRADIENTS[month]
  const angle = YEAR_ANGLES[(year - 2016 + 60) % YEAR_ANGLES.length]
  return `linear-gradient(${angle}deg, ${start}, ${end})`
}
</script>
