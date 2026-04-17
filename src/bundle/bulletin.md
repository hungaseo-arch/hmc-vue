/**
 * 자카르타 한마음교회 주보보기 크롤러 v2 ✅ 최종
 *
 * 확인된 구조:
 *  - 목록 URL: /main/sub.html?boardID=www22&page=N
 *  - 목록 링크: <a href="/main/sub.html?Mode=view&boardID=www22&num=647...">26년 3월 8일 주보</a>
 *  - 이미지: /core/anyboard/content.html?Mode=view&boardID=www22&num=NUM
 *    → <img src="/user/saveDir/board/www22/NUM_XXXXX_0.jpg">
 *
 * ⚠️ 실행 위치: 주보보기 상세 페이지 탭에서 실행
 *   http://www.hanmaumch.id/main/sub.html?Mode=view&boardID=www22&num=647...
 */

(async function () {
  const results = [];
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const origin = window.location.origin;
  const boardID = 'www22';

  // ── SheetJS 로드 ─────────────────────────────────────────────────────────────
  if (!window.XLSX) {
    console.log('📦 SheetJS 로딩...');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  console.log('✅ SheetJS 준비');

  // ── 목록 페이지 fetch ─────────────────────────────────────────────────────────
  async function fetchListHTML(page) {
    const url = page === 1
      ? `${origin}/main/sub.html?boardID=${boardID}&keyfield=&key=&bCate=`
      : `${origin}/main/sub.html?boardID=${boardID}&page=${page}&keyfield=&key=&bCate=`;
    return fetch(url, { credentials: 'same-origin' }).then(r => r.text());
  }

  // ── 총 페이지 수 파악 ─────────────────────────────────────────────────────────
  function getTotalPages(html) {
    // 페이지네이션: page=N&boardID=www22 또는 page=N&boardID=www22
    const m1 = [...html.matchAll(/href='[^']*page=(\d+)[^']*boardID=www22/g)];
    const m2 = [...html.matchAll(/href="[^"]*page=(\d+)[^"]*boardID=www22/g)];
    const pages = [...m1, ...m2].map(m => parseInt(m[1])).filter(n => n > 0 && n < 9999);
    
    // 총 건수에서 계산 (새글 0 / 214)
    const totalMatch = html.match(/새글\s*\d+\s*\/\s*(\d+)/);
    if (totalMatch) {
      const total = parseInt(totalMatch[1]);
      return Math.ceil(total / 15);
    }
    
    return pages.length ? Math.max(...pages) : 15;
  }

  // ── 목록 파싱 - href 방식 ─────────────────────────────────────────────────────
  function parseListHTML(html) {
    const rows = [];

    // 패턴: href="/main/sub.html?Mode=view&boardID=www22&num=647..." >제목</a>
    const linkPattern = /href="([^"]*Mode=view&boardID=www22&num=(\d+)[^"]*)"[^>]*>\s*([^<]+?)\s*<\/a>/g;
    const matches = [...html.matchAll(linkPattern)];

    // 날짜: 등록일 패턴 (yyyy.MM.dd)
    const datePattern = /(\d{4}\.\d{2}\.\d{2})/g;
    const allDates = [...html.matchAll(datePattern)].map(m => m[1]);

    // 번호: 214, 213, 212...
    const numPattern = /<td[^>]*>\s*(\d{3})\s*<\/td>/g;
    const allNums = [...html.matchAll(numPattern)].map(m => m[1]);

    // 중복 제거하고 실제 게시물 링크만 추출
    const seen = new Set();
    matches.forEach((m, i) => {
      const numId = m[2];
      const title = m[3].trim();
      if (seen.has(numId)) return;
      if (!title || title.length < 2) return;
      seen.add(numId);

      rows.push({
        num: allNums[rows.length] || String(parseInt(numId)),
        numId,
        title,
        date: allDates[rows.length] || '',
        images: []
      });
    });

    return rows;
  }

  // ── 이미지 URL 수집 ───────────────────────────────────────────────────────────
  async function getImages(numId) {
    try {
      const url = `${origin}/core/anyboard/content.html?Mode=view&boardID=${boardID}&num=${numId}`;
      const html = await fetch(url, { credentials: 'same-origin' }).then(r => r.text());
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // saveDir 이미지 추출
      const imgs = [...doc.querySelectorAll('img')]
        .map(img => img.getAttribute('src') || img.src)
        .filter(src => src && src.includes('saveDir'));

      // src가 상대경로면 절대경로로 변환
      return imgs.map(src => src.startsWith('http') ? src : `${origin}${src}`);
    } catch (e) {
      console.warn(`❌ num=${numId}:`, e.message);
      return [];
    }
  }

  // ── xlsx 다운로드 ─────────────────────────────────────────────────────────────
  function downloadXLSX(data) {
    // 최대 이미지 수 계산
    const maxImgs = Math.max(...data.map(r => r.images.length), 1);
    const imgHeaders = Array.from({ length: maxImgs }, (_, i) => `이미지URL${i + 1}`);
    const headers = ['번호', '제목', '날짜', ...imgHeaders];

    const wsData = [
      headers,
      ...data.map(r => [
        r.num, r.title, r.date,
        ...Array.from({ length: maxImgs }, (_, i) => r.images[i] || '')
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 6 }, { wch: 25 }, { wch: 12 },
      ...Array(maxImgs).fill({ wch: 70 })
    ];

    // 헤더 스타일
    headers.forEach((_, i) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FCE4D6' } } };
    });

    XLSX.utils.book_append_sheet(wb, ws, '주보보기');
    XLSX.writeFile(wb, '한마음교회_주보보기.xlsx');
    console.log('✅ 엑셀 다운로드 완료!');
  }

  // ── 메인 실행 ─────────────────────────────────────────────────────────────────
  console.log('🚀 주보보기 크롤러 v2 시작');

  // 1페이지
  const firstHtml = await fetchListHTML(1);
  const totalPages = getTotalPages(firstHtml);
  const firstRows = parseListHTML(firstHtml);
  results.push(...firstRows);
  console.log(`📋 총 ${totalPages}페이지 | 1페이지: ${firstRows.length}건`);
  if (firstRows.length > 0) {
    console.log('  샘플:', firstRows[0]);
  } else {
    // 디버그: 첫 번째 href 패턴 확인
    const sample = [...firstHtml.matchAll(/href="([^"]*boardID=www22[^"]*)"[^>]*>([^<]+)/g)].slice(0, 3);
    console.log('  ⚠️ 0건! href 샘플:', sample.map(m => [m[1].slice(-30), m[2].trim()]));
  }

  // 2페이지~
  for (let page = 2; page <= totalPages; page++) {
    await delay(300);
    const html = await fetchListHTML(page);
    const rows = parseListHTML(html);
    if (rows.length === 0) {
      console.log(`  ⚠️ ${page}페이지 0건 → 중단`);
      break;
    }
    results.push(...rows);
    console.log(`  📄 ${page}/${totalPages}페이지 → ${rows.length}건 (누적 ${results.length}건)`);
  }

  console.log(`\n📋 목록 수집 완료: ${results.length}건`);

  if (results.length === 0) {
    console.log('❌ 목록 수집 실패. 엑셀은 헤더만 저장합니다.');
    downloadXLSX([{ num: '', numId: '', title: '수집실패', date: '', images: [] }]);
    return;
  }

  // 이미지 수집 테스트
  console.log(`\n🔍 이미지 테스트 (num=${results[0].numId})...`);
  results[0].images = await getImages(results[0].numId);
  console.log(`  이미지: ${results[0].images.length}개`, results[0].images[0] || '❌없음');

  // 전체 이미지 수집 (3개씩 병렬)
  console.log(`\n🖼️ 이미지 수집 시작 (${results.length}건)...`);
  const BATCH = 3;
  for (let i = 1; i < results.length; i += BATCH) {
    await Promise.all(results.slice(i, i + BATCH).map(async row => {
      row.images = await getImages(row.numId);
    }));
    await delay(300);
    const done = Math.min(i + BATCH, results.length);
    if (done % 15 === 0 || done >= results.length - BATCH) {
      const filled = results.slice(0, done + 1).filter(r => r.images.length > 0).length;
      console.log(`  📖 ${done}/${results.length} | 이미지 수집: ${filled}건`);
    }
  }

  // 결과 미리보기
  console.log('\n📊 수집 결과 (상위 3건):');
  console.table(results.slice(0, 3).map(r => ({
    번호: r.num,
    제목: r.title,
    날짜: r.date,
    이미지수: r.images.length,
    첫이미지: (r.images[0] || '❌없음').slice(-35)
  })));

  const imgCount = results.filter(r => r.images.length > 0).length;
  console.log(`\n🎉 완료! 총 ${results.length}건 | 이미지 있음: ${imgCount}건`);
  downloadXLSX(results);
})();