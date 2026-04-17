/**
 * 자카르타 한마음교회 주일설교 크롤러 v7 (완전 완성)
 *
 * ✅ 확인된 YouTube 추출 방법:
 *    POST /core/xml/vod/vodInfo.xml.html
 *    body: pageCode=6&num={num}&vodType=1
 *    → XML <vodFile>에 YouTube embed URL 포함
 *
 * ✅ 한글 정상 (UTF-8)
 * ✅ 모든 페이지 자동 순회
 * ✅ xlsx 직접 다운로드
 *
 * 사용법: 주일설교 목록 페이지에서 F12 → Console → 전체 붙여넣기 → Enter
 */

(async function () {
  const results = [];
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const origin = window.location.origin;
  const pageCode = new URLSearchParams(window.location.search).get('pageCode') || '6';

  // ── SheetJS 로드 ─────────────────────────────────────────────────────────────
  console.log('📦 SheetJS 로딩...');
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  console.log('✅ SheetJS 로드 완료');

  // ── 총 페이지 수 파악 ─────────────────────────────────────────────────────────
  function getTotalPages(doc) {
    const pages = [...doc.querySelectorAll('a')].map(a => {
      try { return parseInt(new URL(a.href).searchParams.get('page') || '0'); }
      catch { return 0; }
    }).filter(n => n > 0 && n < 9999);
    return pages.length ? Math.max(...pages) : 1;
  }

  // ── 목록 페이지 fetch & parse ─────────────────────────────────────────────────
  async function fetchListDoc(page) {
    const url = `${origin}/main/sub.html?page=${page}&pageCode=${pageCode}&keyfield=&key=`;
    const html = await fetch(url, { credentials: 'same-origin' }).then(r => r.text());
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function parseRows(doc) {
    const rows = [];
    doc.querySelectorAll('table tr').forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return;
      const dateText = (tds[0].innerText || tds[0].textContent || '').trim();
      if (!/^\d{4}[-./]\d{2}[-./]\d{2}$/.test(dateText)) return;
      const titleLink = [...tr.querySelectorAll('a')].find(a => a.href.includes('num='));
      if (!titleLink) return;

      // num 파라미터 추출
      const num = new URL(titleLink.href).searchParams.get('num');

      rows.push({
        date: dateText,
        title: (titleLink.innerText || titleLink.textContent || '').trim(),
        scripture: (tds[2].innerText || tds[2].textContent || '').trim(),
        preacher: (tds[3]?.innerText || tds[3]?.textContent || '').trim(),
        num: num,
        youtube: ''
      });
    });
    return rows;
  }

  // ── 핵심: XML API로 YouTube URL 추출 ─────────────────────────────────────────
  async function getYoutubeUrl(num) {
    if (!num) return '';
    try {
      const xml = await fetch('/core/xml/vod/vodInfo.xml.html', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `pageCode=${pageCode}&num=${num}&vodType=1`
      }).then(r => r.text());

      // <vodFile>에서 YouTube ID 추출
      const vodFileMatch = xml.match(/<vodFile><!\[CDATA\[(.*?)\]\]><\/vodFile>/s);
      if (vodFileMatch) {
        const vodFile = vodFileMatch[1];
        // YouTube ID 추출 (embed URL 또는 watch URL)
        const ytMatch = vodFile.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
        // vodFile 자체가 URL인 경우 그대로 반환
        if (vodFile.includes('youtube.com') || vodFile.includes('youtu.be')) return vodFile;
      }

      // vodPath도 확인
      const vodPathMatch = xml.match(/<vodPath><!\[CDATA\[(.*?)\]\]><\/vodPath>/s);
      if (vodPathMatch) {
        const vodPath = vodPathMatch[1];
        const ytMatch = vodPath.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
      }

    } catch (e) {
      console.warn(`❌ num=${num} 오류:`, e.message);
    }
    return '';
  }

  // ── xlsx 다운로드 ─────────────────────────────────────────────────────────────
  function downloadXLSX(data) {
    const header = ['날짜', '제목', '본문', '설교자', '유튜브 링크'];
    const wsData = [
      header,
      ...data.map(r => [r.date, r.title, r.scripture, r.preacher, r.youtube])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 45 }];

    // 헤더 행 스타일
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9E1F2' } } };
    }

    XLSX.utils.book_append_sheet(wb, ws, '주일설교');
    XLSX.writeFile(wb, '한마음교회_주일설교.xlsx');
    console.log('✅ 엑셀 다운로드 완료!');
  }

  // ── 메인 실행 ─────────────────────────────────────────────────────────────────
  console.log('🚀 크롤러 v7 시작 | pageCode=' + pageCode);

  // 1페이지
  const firstDoc = await fetchListDoc(1);
  const totalPages = getTotalPages(firstDoc);
  const firstRows = parseRows(firstDoc);
  results.push(...firstRows);
  console.log(`📋 총 ${totalPages}페이지 | 1페이지: ${firstRows.length}건`);

  // 2페이지~마지막
  for (let page = 2; page <= totalPages; page++) {
    await delay(300);
    const doc = await fetchListDoc(page);
    const rows = parseRows(doc);
    results.push(...rows);
    console.log(`  📄 ${page}/${totalPages}페이지 → ${rows.length}건 (누적 ${results.length}건)`);
  }

  // YouTube 링크 수집 - XML API 직접 호출 (3개씩 병렬)
  console.log(`\n📺 YouTube 링크 수집 (${results.length}건)...`);
  const BATCH = 3;
  for (let i = 0; i < results.length; i += BATCH) {
    await Promise.all(results.slice(i, i + BATCH).map(async row => {
      row.youtube = await getYoutubeUrl(row.num);
    }));
    await delay(200);
    const done = Math.min(i + BATCH, results.length);
    const found = results.slice(0, done).filter(r => r.youtube).length;
    if (done % 15 === 0 || done === results.length) {
      console.log(`  🔗 ${done}/${results.length} | YouTube: ${found}건`);
    }
  }

  // 결과 미리보기
  console.log('\n📊 수집 결과 (최근 3건):');
  console.table(results.slice(0, 3).map(r => ({
    날짜: r.date,
    제목: r.title.slice(0, 18),
    설교자: r.preacher,
    YouTube: r.youtube ? '✅ ' + r.youtube.slice(-11) : '❌없음'
  })));

  const ytCount = results.filter(r => r.youtube).length;
  console.log(`\n🎉 완료! 총 ${results.length}건 | YouTube: ${ytCount}건`);
  downloadXLSX(results);
})();