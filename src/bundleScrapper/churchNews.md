(async function () {
  var DELAY_BETWEEN = 500;
  var DELAY_RETRY   = 2000;
  var MAX_RETRY     = 3;

  var delay = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
  var origin  = location.origin;
  var boardID = 'www18';

  // ── 라이브러리 로드 ──────────────────────────────────────────────────────────
  function loadScript(src) {
    return new Promise(function(res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  console.log('[1/4] 라이브러리 로딩...');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  console.log('    JSZip + SheetJS 로드 완료');

  // ── 안정적인 fetch (재시도) ──────────────────────────────────────────────────
  async function safeFetch(url, asBlob) {
    for (var attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        var res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return asBlob ? await res.blob() : await res.text();
      } catch (e) {
        if (attempt < MAX_RETRY) {
          console.warn('    retry ' + attempt + '/' + MAX_RETRY + ': ' + url.slice(-40));
          await delay(DELAY_RETRY * attempt);
        } else {
          throw new Error('FAIL(' + MAX_RETRY + '): ' + e.message);
        }
      }
    }
  }

  // ── 작성자 base64 다단 디코딩 ────────────────────────────────────────────────
  function decodeAuthor(encoded) {
    if (!encoded) return '';
    try {
      var s = encoded.trim();
      for (var i = 0; i < 6; i++) {
        var cleaned = s.replace(/[^A-Za-z0-9+\/=]/g, '');
        if (cleaned.length < 4) break;
        var dec = atob(cleaned);
        if (/[가-힯]/.test(dec) || /^[\x20-\x7E]+$/.test(dec.trim())) {
          return dec.trim();
        }
        s = dec;
      }
    } catch (_) {}
    return encoded;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1단계: 전체 목록 수집
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('\n[2/4] 목록 수집 시작...');

  var allItems = [];
  var seenIds  = new Set();

  for (var page = 1; page <= 30; page++) {
    var listUrl = origin + '/main/sub.html?page=' + page + '&boardID=' + boardID + '&keyfield=&key=&bCate=';
    var html;
    try { html = await safeFetch(listUrl); }
    catch (e) { console.warn('  page ' + page + ' 실패: ' + e.message); break; }

    if (page === 1) {
      var mTotal = html.match(/새글\s*\d+\s*\/\s*(\d+)/);
      if (mTotal) console.log('  총 ' + mTotal[1] + '건');
    }

    var doc  = new DOMParser().parseFromString(html, 'text/html');
    var rows = Array.from(doc.querySelectorAll('table tr'));
    var added = 0;

    rows.forEach(function(row) {
      var tds = Array.from(row.querySelectorAll('td'));
      if (tds.length < 4) return;

      var anchor = tds[1].querySelector('a[onclick]');
      if (!anchor) return;

      var onclick  = anchor.getAttribute('onclick') || '';
      var numMatch = onclick.match(/permitCheck\s*\(\s*['"][^'"]*['"]\s*,\s*['"](\d+)['"]/);
      if (!numMatch) return;

      var numId = numMatch[1];
      if (seenIds.has(numId)) return;
      seenIds.add(numId);

      var title = (anchor.textContent || '').trim()
        .split('\n')[0].trim()
        .replace(/[\\/:*?"<>|]/g, '_')
        .slice(0, 80);
      if (!title || title.length < 2) return;

      var authorRaw = tds[2].textContent.trim();
      var dateMatch = tds[3].textContent.trim().match(/\d{4}\.\d{2}\.\d{2}/);
      var date      = dateMatch ? dateMatch[0] : '';

      allItems.push({ numId: numId, title: title, authorRaw: authorRaw, date: date });
      added++;
    });

    console.log('  page ' + page + ': ' + added + '건 (누적 ' + allItems.length + '건)');
    if (added === 0) { console.log('  -> 마지막 페이지'); break; }
    await delay(300);
  }

  if (allItems.length === 0) {
    console.error('수집된 항목 없음. URL/boardID 확인 필요');
    return;
  }
  console.log('  목록 수집 완료: ' + allItems.length + '건');

  // ══════════════════════════════════════════════════════════════════════════════
  // 2단계: 상세 페이지 → 작성자 + 이미지
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('\n[3/4] 상세 정보 + 이미지 수집...');

  var zip      = new JSZip();
  var folder   = zip.folder('HMC_교회소식');
  var excelRows = [];
  var imgTotal  = 0;
  var failTotal = 0;

  for (var i = 0; i < allItems.length; i++) {
    var item      = allItems[i];
    var author    = '';
    var imgUrls   = [];

    try {
      var detailHtml = await safeFetch(
        origin + '/core/anyboard/content.html?Mode=view&boardID=' + boardID + '&num=' + item.numId
      );
      var ddoc = new DOMParser().parseFromString(detailHtml, 'text/html');

      // 작성자 셀렉터 순서대로 시도
      var candidates = [
        ddoc.querySelector('.writer'),
        ddoc.querySelector('.writerName'),
        ddoc.querySelector('[class*="writer"]'),
        ddoc.querySelector('[class*="author"]'),
        (function() {
          var all = Array.from(ddoc.querySelectorAll('td, th, span, div'));
          var lbl = all.find(function(el) { return el.textContent.trim() === '작성자'; });
          return lbl ? lbl.nextElementSibling : null;
        })()
      ];
      for (var c = 0; c < candidates.length; c++) {
        if (candidates[c] && candidates[c].textContent.trim()) {
          author = candidates[c].textContent.trim();
          break;
        }
      }

      imgUrls = Array.from(ddoc.querySelectorAll('img'))
        .map(function(img) { return img.getAttribute('src') || ''; })
        .filter(function(src) { return src && (src.includes('saveDir') || src.includes('upload')); })
        .map(function(src) {
          if (src.startsWith('http')) return src;
          return origin + (src.startsWith('/') ? '' : '/') + src;
        });

    } catch (e) {
      console.warn('  [' + (i+1) + '/' + allItems.length + '] num=' + item.numId + ' 상세 실패: ' + e.message);
      failTotal++;
    }

    if (!author) author = decodeAuthor(item.authorRaw);

    // 이미지 다운로드
    var imgFilenames = [];
    for (var j = 0; j < imgUrls.length; j++) {
      var src = imgUrls[j];
      var extRaw = src.split('.').pop().split('?')[0] || 'jpg';
      var ext    = extRaw.toLowerCase().slice(0, 5);
      var no     = String(allItems.length - i).padStart(3, '0');
      var pg     = imgUrls.length > 1 ? '_p' + String(j+1).padStart(2, '0') : '';
      var fname  = no + '_' + item.date + '_' + item.title.slice(0, 30) + pg + '.' + ext;

      try {
        var blob = await safeFetch(src, true);
        folder.file(fname, blob);
        imgFilenames.push(fname);
        imgTotal++;
      } catch (e) {
        console.warn('    img fail: ' + fname);
        imgFilenames.push('[fail] ' + fname);
        failTotal++;
      }
      await delay(200);
    }

    excelRows.push({
      '번호': allItems.length - i,
      '제목': item.title,
      '작성자': author,
      '등록일': item.date,
      '이미지수': imgUrls.length,
      '이미지파일명': imgFilenames.join(' | ')
    });

    if ((i+1) % 10 === 0 || i+1 === allItems.length) {
      var pct = Math.round((i+1) / allItems.length * 100);
      console.log('  [' + (i+1) + '/' + allItems.length + '] ' + pct + '% | img ' + imgTotal + 'ea');
    }

    await delay(DELAY_BETWEEN);
  }

  // ── ZIP 저장 ─────────────────────────────────────────────────────────────────
  if (imgTotal > 0) {
    console.log('\n[3.5] ZIP 압축...');
    var zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
    var za = document.createElement('a');
    za.href = URL.createObjectURL(zipBlob);
    za.download = '한마음교회_교회소식_이미지.zip';
    document.body.appendChild(za); za.click(); document.body.removeChild(za);
    await delay(1000);
    URL.revokeObjectURL(za.href);
    console.log('  ZIP: ' + (zipBlob.size/1024/1024).toFixed(1) + 'MB');
  }

  // ── Excel 저장 ───────────────────────────────────────────────────────────────
  console.log('\n[4/4] Excel 저장...');
  var ws = XLSX.utils.json_to_sheet(excelRows);
  ws['!cols'] = [{ wch:6 }, { wch:50 }, { wch:20 }, { wch:12 }, { wch:8 }, { wch:80 }];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '교회소식');
  XLSX.writeFile(wb, '한마음교회_교회소식.xlsx');

  console.log('\n==============================');
  console.log('완료! 게시글: ' + allItems.length + '건 | 이미지: ' + imgTotal + '개 | 실패: ' + failTotal + '개');
  console.log('==============================');
})();
