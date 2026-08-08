<template>
  <footer class="bg-foreground text-background mt-auto">
    <div class="border-t border-background/10">
      <div class="container mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-background/50">
        <span class="font-bold">© 2026 자카르타 한마음교회. All rights reserved.</span>
        <span>
          계좌번호 YAYASAN SEHATI SEIMAN<br>
          - IDR: KEB HANA BANK 111521200000811<br>
          - USD: KEB HANA BANK 15656130670</span>
        <span class="font-bold">내가 이 반석 위에 교회를 세우리니 (마 16:18)</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// MapPin·Phone 아이콘은 3단 레이아웃을 걷어내면서 쓰는 곳이 없어졌다.
// 레이아웃을 되살리면 lucide-vue-next 에서 다시 가져오면 된다.

// 푸터용 예배 시간 (데이터를 컴포넌트 내에서 정의)
// const footerSchedules = [
//   { name: '주일 1부 예배', shortTime: '오전 9:00' },
//   { name: '주일 2부 예배', shortTime: '오전 11:00' },
//   { name: '수요 기도회', shortTime: '오전 10:30' },
//   { name: '새벽 온라인 기도회', shortTime: '오전 4:00' },
// ]
</script>
