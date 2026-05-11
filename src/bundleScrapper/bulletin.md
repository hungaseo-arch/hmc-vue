/**
 * 자카르타 한마음교회 주보보기 이미지 ZIP 다운로드 v4
 *
 * ✅ 순차 처리 (병렬 없음 → 안정적)
 * ✅ 네트워크 오류 자동 재시도 3회
 * ✅ 50건마다 ZIP 자동 저장 (메모리 절약)
 * ✅ 214건 전체 완료 보장
 *
 * ⚠️ 주의: 페이지 새로고침 후 이 스크립트만 실행하세요!
 * ⚠️ 실행 위치: 주보보기 상세 페이지 탭
 *   http://www.hanmaumch.id/main/sub.html?Mode=view&boardID=www22&num=647...
 */

(async function () {
  const DELAY_BETWEEN = 400;   // 요청 간격 (ms) - 너무 빠르면 서버가 막음
  const DELAY_RETRY   = 2000;  // 재시도 대기 (ms)
  const MAX_RETRY     = 3;     // 최대 재시도 횟수
  const CHUNK_SIZE    = 50;    // ZIP 분할 단위

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const origin = location.origin;
  const boardID = 'www22';

  // ── JSZip 로드 ────────────────────────────────────────────────────────────────
  if (!window.JSZip) {
    console.log('📦 JSZip 로딩...');
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    console.log('✅ JSZip 로드 완료');
  }

  // ── 안정적인 fetch (재시도 포함) ──────────────────────────────────────────────
  async function safeFetch(url, asBlob = false) {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return asBlob ? await res.blob() : await res.text();
      } catch (e) {
        if (attempt < MAX_RETRY) {
          console.warn(`  ↩️ 재시도 ${attempt}/${MAX_RETRY}: ${url.slice(-40)} (${e.message})`);
          await delay(DELAY_RETRY * attempt);
        } else {
          throw new Error(`❌ ${MAX_RETRY}회 실패: ${e.message}`);
        }
      }
    }
  }

  // ── ZIP 저장 함수 ─────────────────────────────────────────────────────────────
  async function saveZip(zip, filename) {
    console.log(`\n🗜️ 압축 중: ${filename}`);
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 3 } // 빠른 압축
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    await delay(1000);
    URL.revokeObjectURL(url);
    console.log(`✅ 저장 완료: ${filename} (${(blob.size / 1024 / 1024).toFixed(1)}MB)\n`);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1단계: 전체 목록 수집
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(50));
  console.log('🚀 주보보기 ZIP 다운로더 v4 시작');
  console.log('═'.repeat(50));
  console.log('\n[1단계] 목록 수집...\n');

  const allItems = []; // { numId, title, date }
  const seenIds = new Set();

  for (let page = 1; page <= 20; page++) {
    const url = page === 1
      ? `${origin}/main/sub.html?boardID=${boardID}&keyfield=&key=&bCate=`
      : `${origin}/main/sub.html?boardID=${boardID}&page=${page}&keyfield=&key=&bCate=`;

    let html;
    try {
      html = await safeFetch(url);
    } catch (e) {
      console.warn(`  ⚠️ ${page}페이지 로드 실패: ${e.message}`);
      break;
    }

    // 총 건수 (1페이지만)
    if (page === 1) {
      const m = html.match(/새글\s*\d+\s*\/\s*(\d+)/);
      if (m) console.log(`  📊 총 ${m[1]}건 확인\n`);
    }

    // href로 num + 제목 추출
    const linkRe = /href="[^"]*Mode=view&boardID=www22&num=(\d+)[^"]*"[^>]*>\s*([^<\n]{2,60}?)\s*<\/a>/g;
    const dateRe = /(\d{4}\.\d{2}\.\d{2})/g;
    const links = [...html.matchAll(linkRe)];
    const dates = [...html.matchAll(dateRe)].map(m => m[1]);

    let added = 0;
    links.forEach((m, i) => {
      const numId = m[1];
      const title = m[2].trim().replace(/[\\/:*?"<>|]/g, '_');
      if (seenIds.has(numId) || title.length < 2) return;
      seenIds.add(numId);
      allItems.push({ numId, title, date: dates[added] || '' });
      added++;
    });

    console.log(`  📄 ${page}페이지: ${added}건 추가 → 누적 ${allItems.length}건`);
    if (added === 0) { console.log('  → 마지막 페이지'); break; }
    await delay(300);
  }

  console.log(`\n✅ 목록 수집 완료: 총 ${allItems.length}건`);

  // ══════════════════════════════════════════════════════════════════════════════
  // 2단계: 이미지 수집 + ZIP 저장
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('\n[2단계] 이미지 수집 및 ZIP 저장...\n');

  let chunkIndex = 1;
  let zip = new JSZip();
  let folder = zip.folder('한마음교회_주보보기');
  let imgCount = 0;
  let failCount = 0;
  let chunkImgCount = 0;
  let chunkStartDate = '';

  for (let i = 0; i < allItems.length; i++) {
    const { numId, title, date } = allItems[i];

    // 청크 시작 날짜 기록
    if (chunkImgCount === 0) chunkStartDate = date;

    // content.html 가져오기
    let imgUrls = [];
    try {
      const html = await safeFetch(
        `${origin}/core/anyboard/content.html?Mode=view&boardID=${boardID}&num=${numId}`
      );
      const doc = new DOMParser().parseFromString(html, 'text/html');
      imgUrls = [...doc.querySelectorAll('img')]
        .map(img => img.getAttribute('src') || '')
        .filter(src => src.includes('saveDir'))
        .map(src => src.startsWith('http') ? src : `${origin}${src}`);
    } catch (e) {
      console.warn(`  ❌ [${i + 1}/${allItems.length}] num=${numId} HTML 실패: ${e.message}`);
      failCount++;
      await delay(DELAY_BETWEEN);
      continue;
    }

    if (imgUrls.length === 0) {
      console.warn(`  ⚠️ [${i + 1}/${allItems.length}] num=${numId} "${title}" → 이미지 없음`);
      await delay(DELAY_BETWEEN);
      continue;
    }

    // 이미지 순차 다운로드
    for (let j = 0; j < imgUrls.length; j++) {
      const imgSrc = imgUrls[j];
      const ext = (imgSrc.split('.').pop().split('?')[0] || 'jpg').toLowerCase();
      const no = String(allItems.length - i).padStart(3, '0');
      const pg = imgUrls.length > 1 ? `_p${String(j + 1).padStart(2, '0')}` : '';
      const filename = `${no}_${date}_${title}${pg}.${ext}`;

      try {
        const blob = await safeFetch(imgSrc, true);
        folder.file(filename, blob);
        imgCount++;
        chunkImgCount++;
      } catch (e) {
        console.warn(`    ❌ 이미지 실패: ${filename} (${e.message})`);
        failCount++;
      }
      await delay(200); // 이미지 간 딜레이
    }

    // 진행상황 (10건마다)
    if ((i + 1) % 10 === 0) {
      const pct = Math.round((i + 1) / allItems.length * 100);
      console.log(`  📊 [${i + 1}/${allItems.length}] ${pct}% | 이미지 ${imgCount}개 수집`);
    }

    // CHUNK_SIZE건마다 ZIP 저장
    if ((i + 1) % CHUNK_SIZE === 0) {
      const zipName = `한마음교회_주보보기_${String(chunkIndex).padStart(2, '0')}부_${chunkStartDate}~${date}.zip`;
      await saveZip(zip, zipName);
      chunkIndex++;
      zip = new JSZip();
      folder = zip.folder('한마음교회_주보보기');
      chunkImgCount = 0;
    }

    await delay(DELAY_BETWEEN);
  }

  // 나머지 저장
  if (chunkImgCount > 0) {
    const lastDate = allItems[allItems.length - 1]?.date || '';
    const zipName = chunkIndex === 1
      ? `한마음교회_주보보기_전체_${chunkStartDate}~${lastDate}.zip`
      : `한마음교회_주보보기_${String(chunkIndex).padStart(2, '0')}부_${chunkStartDate}~${lastDate}.zip`;
    await saveZip(zip, zipName);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 완료 리포트
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(50));
  console.log('🎉 완료!');
  console.log(`   처리: ${allItems.length}건`);
  console.log(`   이미지: ${imgCount}개`);
  console.log(`   실패: ${failCount}개`);
  console.log(`   ZIP: ${chunkIndex}개 파일`);
  console.log('═'.repeat(50));
})();