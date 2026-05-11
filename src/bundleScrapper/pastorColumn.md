/**
 * 자카르타 한마음교회 목회칼럼 크롤러 v6 ✅ 최종 완성
 *
 * 확인된 구조:
 *  - 목록: /main/sub.html?boardID=www7&page=N
 *    → permitCheck('beforeview', 'NUM') 패턴에서 num 추출
 *  - 본문: /core/anyboard/content.html?Mode=view&boardID=www7&num=NUM
 *    → iframe으로 로드되는 실제 본문 URL!
 *
 * ⚠️ 실행 위치: 상세 페이지 탭에서 실행
 *   http://www.hanmaumch.id/main/sub.html?Mode=view&boardID=www7&num=653&...
 *
 * 사용법: F12 → Console → 전체 붙여넣기 → Enter
 */

(async function () {
  const results = [];
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const origin = window.location.origin;
  const boardID = 'www7';

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
  // page=1은 파라미터 없이, 이후는 page=N
  async function fetchListHTML(page) {
    const url = page === 1
      ? `${origin}/main/sub.html?boardID=${boardID}&keyfield=&key=&bCate=`
      : `${origin}/main/sub.html?boardID=${boardID}&page=${page}&keyfield=&key=&bCate=`;
    return fetch(url, { credentials: 'same-origin' }).then(r => r.text());
  }

  // ── 총 페이지 수 파악 ─────────────────────────────────────────────────────────
  function getTotalPages(html) {
    // href='/main/sub.html?page=N&boardID=www7' 패턴에서 최대 page 추출
    const matches = [...html.matchAll(/href='[^']*page=(\d+)[^']*boardID=www7/g)];
    const pages = matches.map(m => parseInt(m[1])).filter(n => n > 1 && n < 9999);
    return pages.length ? Math.max(...pages) : 1;
  }

  // ── 목록 파싱: num, 제목, 날짜 ───────────────────────────────────────────────
  function parseListHTML(html) {
    const rows = [];
    
    // num 추출: permitCheck('beforeview', 'NUM', ...)
    const numMatches = [...html.matchAll(/permitCheck\('beforeview',\s*'(\d+)'/g)];
    
    // 번호 추출: <p class="fontSize11">117</p> (숫자만, 날짜 형식 제외)
    const numTextMatches = [...html.matchAll(/<p class="fontSize11">(\d{1,3})<\/p>/g)];
    
    // 제목 추출: title="2026.04.05 고목사의 짧은 단상"
    const titleMatches = [...html.matchAll(/title="([^"]+고목사[^"]+)"/g)];
    
    // 날짜 추출: <p class="fontSize11">2026.04.05</p>
    const dateMatches = [...html.matchAll(/<p class="fontSize11">(\d{4}\.\d{1,2}\.\d{1,2})<\/p>/g)];

    for (let i = 0; i < numMatches.length; i++) {
      rows.push({
        num: numTextMatches[i]?.[1] || String(numMatches.length - i),
        numId: numMatches[i][1],
        title: titleMatches[i]?.[1]?.trim() || '',
        date: dateMatches[i]?.[1] || '',
        content: ''
      });
    }
    return rows;
  }

  // ── 핵심: iframe URL로 본문 직접 fetch ────────────────────────────────────────
  // 확인된 URL: /core/anyboard/content.html?Mode=view&boardID=www7&num=653
  async function getContent(numId) {
    if (!numId) return '';
    try {
      const url = `${origin}/core/anyboard/content.html?Mode=view&boardID=${boardID}&num=${numId}`;
      const html = await fetch(url, { credentials: 'same-origin' }).then(r => r.text());
      
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // body 전체에서 본문 추출
      const body = doc.body;
      if (!body) return '';
      
      // 불필요한 요소 제거
      const clone = body.cloneNode(true);
      clone.querySelectorAll('script, style, head').forEach(el => el.remove());
      
      const text = clone.textContent.trim();
      if (text.length > 10) return text.replace(/\s+/g, ' ').trim();
      
    } catch (e) {
      console.warn(`❌ num=${numId}:`, e.message);
    }
    return '';
  }

  // ── xlsx 다운로드 ─────────────────────────────────────────────────────────────
  function downloadXLSX(data) {
    const header = ['번호', '제목', '날짜', '본문'];
    const wsData = [header, ...data.map(r => [r.num, r.title, r.date, r.content])];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 12 }, { wch: 100 }];
    
    // 헤더 스타일
    ['A1','B1','C1','D1'].forEach(addr => {
      if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E2EFDA' } } };
    });
    
    XLSX.utils.book_append_sheet(wb, ws, '목회칼럼');
    XLSX.writeFile(wb, '한마음교회_목회칼럼.xlsx');
    console.log('✅ 엑셀 다운로드 완료!');
  }

  // ── 메인 실행 ─────────────────────────────────────────────────────────────────
  console.log('🚀 목회칼럼 크롤러 v6 시작 (iframe 방식)');

  // 1페이지
  const firstHtml = await fetchListHTML(1);
  const totalPages = getTotalPages(firstHtml);
  const firstRows = parseListHTML(firstHtml);
  results.push(...firstRows);
  console.log(`📋 총 ${totalPages}페이지 | 1페이지: ${firstRows.length}건`);
  if (firstRows.length > 0) {
    console.log('  샘플:', firstRows[0]);
  }

  // 2페이지~마지막
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

  // 본문 수집 테스트 (1건)
  console.log('\n🔍 본문 수집 테스트 (num=653)...');
  const testContent = await getContent('653');
  console.log('테스트 결과:', testContent.slice(0, 100) || '❌ 비어있음');

  if (!testContent) {
    console.log('❌ 본문 수집 실패 - URL 확인 필요');
    downloadXLSX(results); // 목록만이라도 저장
    return;
  }

  // 전체 본문 수집 (3개씩 병렬)
  console.log(`\n📝 본문 수집 시작 (${results.length}건)...`);
  results[0].content = testContent; // 테스트 결과 재활용

  const BATCH = 3;
  for (let i = 1; i < results.length; i += BATCH) {
    await Promise.all(results.slice(i, i + BATCH).map(async row => {
      row.content = await getContent(row.numId);
    }));
    await delay(300);
    const done = Math.min(i + BATCH, results.length);
    if (done % 15 === 0 || done >= results.length - BATCH) {
      const filled = results.slice(0, done + 1).filter(r => r.content).length;
      console.log(`  📖 ${done}/${results.length} | 본문: ${filled}건`);
    }
  }

  // 결과 미리보기
  console.log('\n📊 수집 결과 (상위 3건):');
  console.table(results.slice(0, 3).map(r => ({
    번호: r.num,
    제목: r.title.slice(0, 25),
    날짜: r.date,
    본문: (r.content || '❌없음').slice(0, 30) + '...'
  })));

  const contentCount = results.filter(r => r.content).length;
  console.log(`\n🎉 완료! 총 ${results.length}건 | 본문: ${contentCount}건`);
  downloadXLSX(results);
})();