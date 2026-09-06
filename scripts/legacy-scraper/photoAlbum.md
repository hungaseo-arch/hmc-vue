# 한마음교회 포토앨범(www19) — 제목·작성자·등록일 → Excel + 사진 → ZIP

## 실행 방법
1. 브라우저에서 `http://www.hanmaumch.id/main/sub.html?pageCode=19` 접속
2. **F12 → Console** 탭 열기
3. 아래 코드 **전체** 복사 → 붙여넣기 → **Enter**

---

```javascript
(async function () {
  var DELAY  = 500;
  var RETRY  = 2000;
  var MAX_RT = 3;
  var CHUNK  = 30;
  var delay  = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var origin  = location.origin;
  var boardID = 'www19';

  // ── 라이브러리 로드 ───────────────────────────────────────────────────────────
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) { res(); return; }
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  console.log('[1/4] 라이브러리 로딩...');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  console.log('    JSZip + SheetJS 완료');

  // ── safeFetch (텍스트) ────────────────────────────────────────────────────────
  async function safeFetch(url) {
    for (var t = 1; t <= MAX_RT; t++) {
      try {
        var res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.text();
      } catch (e) {
        if (t < MAX_RT) { await delay(RETRY * t); }
        else throw e;
      }
    }
  }

  // ── 파일 다운로드 (POST → Blob) ───────────────────────────────────────────────
  async function downloadFile(fileID) {
    var url = origin + '/core/anyboard/download.php?boardID=' + boardID + '&fileNum=' + fileID;
    for (var t = 1; t <= MAX_RT; t++) {
      try {
        var res = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'password='
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        var ct = res.headers.get('Content-Type') || '';
        if (ct.includes('text/html')) throw new Error('권한없음(HTML응답)');

        // Content-Disposition 에서 파일명 추출
        var cd  = res.headers.get('Content-Disposition') || '';
        var fnM = cd.match(/filename[*]?\s*=\s*(?:UTF-8''|")?([^";\r\n]+)/i);
        var fname = fnM ? decodeURIComponent(fnM[1].trim().replace(/"/g, '')) : ('file_' + fileID);

        // 확장자 없으면 Content-Type 으로 추론
        if (fname.indexOf('.') === -1) {
          if (ct.includes('jpeg') || ct.includes('jpg')) fname += '.jpg';
          else if (ct.includes('png'))  fname += '.png';
          else if (ct.includes('gif'))  fname += '.gif';
          else if (ct.includes('webp')) fname += '.webp';
        }

        return { blob: await res.blob(), fname: fname };
      } catch (e) {
        if (t < MAX_RT) { console.warn('    retry fileID=' + fileID + ': ' + e.message); await delay(RETRY * t); }
        else throw e;
      }
    }
  }

  // ── anySecure 작성자 디코딩 ───────────────────────────────────────────────────
  var _cache = {};
  function decodeAuthor(encoded) {
    if (!encoded) return '';
    encoded = encoded.trim();
    if (_cache[encoded]) return _cache[encoded];
    try {
      var uid = 'ANYSEC_' + Math.random().toString(36).substr(2, 8);
      var sp  = document.createElement('span');
      sp.id = uid; sp.innerHTML = encoded;
      document.body.appendChild(sp);
      if (typeof anySecure !== 'undefined' && anySecure.setDecode) {
        anySecure.setDecode(uid, 'inner', uid);
      }
      var decoded = sp.innerHTML;
      document.body.removeChild(sp);
      _cache[encoded] = (decoded && decoded !== encoded) ? decoded : encoded;
    } catch (_) { _cache[encoded] = encoded; }
    return _cache[encoded];
  }

  // ── ZIP 저장 ─────────────────────────────────────────────────────────────────
  async function saveZip(zip, filename) {
    var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    await delay(800); URL.revokeObjectURL(a.href);
    console.log('  ZIP 저장: ' + filename + ' (' + (blob.size/1024/1024).toFixed(1) + 'MB)');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1단계: 전체 목록 수집
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('\n[2/4] 목록 수집...');
  var allItems = [];
  var seenIds  = new Set();

  for (var page = 1; page <= 30; page++) {
    var listUrl = origin + '/main/sub.html?page=' + page
                + '&boardID=' + boardID + '&keyfield=&key=&bCate=';
    var html;
    try { html = await safeFetch(listUrl); }
    catch (e) { console.warn('  p' + page + ' 실패: ' + e.message); break; }

    if (page === 1) {
      var mt = html.match(/새글\s*\d+\s*\/\s*(\d+)/);
      if (mt) console.log('  총 ' + mt[1] + '건');
    }

    var doc  = new DOMParser().parseFromString(html, 'text/html');
    var rows = Array.from(doc.querySelectorAll('table tr'));
    var added = 0;

    rows.forEach(function (row) {
      var tds = Array.from(row.querySelectorAll('td'));
      if (tds.length < 4) return;
      var anchor = tds[1].querySelector('a[onclick]');
      if (!anchor) return;
      var onclick = anchor.getAttribute('onclick') || '';
      var nm = onclick.match(/permitCheck\s*\(\s*['"][^'"]*['"]\s*,\s*['"](\d+)['"]/);
      if (!nm) return;
      var numId = nm[1];
      if (seenIds.has(numId)) return;
      seenIds.add(numId);

      var titleNode = Array.from(anchor.childNodes)
        .find(function (n) { return n.nodeType === 3 && n.textContent.trim().length > 1; });
      var title = (titleNode ? titleNode.textContent.trim()
                             : anchor.textContent.trim().split('\n')[0].trim())
        .replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
      if (!title || title.length < 2) return;

      var authorRaw = tds[2].textContent.trim();
      var dm   = tds[3].textContent.trim().match(/\d{4}\.\d{2}\.\d{2}/);
      var date = dm ? dm[0] : '';
      allItems.push({ numId: numId, title: title, authorRaw: authorRaw, date: date });
      added++;
    });

    console.log('  page ' + page + ': ' + added + '건 (누적 ' + allItems.length + ')');
    if (added === 0) { console.log('  → 마지막'); break; }
    await delay(300);
  }

  if (allItems.length === 0) { console.error('수집 항목 없음'); return; }
  console.log('  수집 완료: ' + allItems.length + '건');

  // ══════════════════════════════════════════════════════════════════════════════
  // 2단계: 상세 페이지 → fileID 추출 + 파일 다운로드
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('\n[3/4] 이미지 다운로드...');

  var excelRows  = [];
  var imgTotal   = 0;
  var failTotal  = 0;
  var chunkIdx   = 1;
  var zip        = new JSZip();
  var folder     = zip.folder('HMC_포토앨범');
  var chunkCount = 0;

  for (var i = 0; i < allItems.length; i++) {
    var item = allItems[i];

    // core content 페이지에서 #AB_viewContent 내 이미지 src 직접 추출
    var imgFilenames = [];
    var coreHtml = '';
    try {
      coreHtml = await safeFetch(
        origin + '/core/anyboard/content.html?Mode=view&boardID=' + boardID + '&num=' + item.numId
      );
    } catch (e) {
      console.warn('  [' + (i+1) + '] core 실패: ' + e.message);
      failTotal++;
    }

    if (coreHtml) {
      var cdoc    = new DOMParser().parseFromString(coreHtml, 'text/html');
      var imgSrcs = Array.from(cdoc.querySelectorAll('#AB_viewContent img'))
        .map(function (img) { return img.getAttribute('src') || ''; })
        .filter(function (src) { return src && src.includes('/user/saveDir/'); })
        .map(function (src) { return src.startsWith('http') ? src : origin + src; });

      for (var j = 0; j < imgSrcs.length; j++) {
        try {
          var ir    = await fetch(imgSrcs[j], { credentials: 'same-origin' });
          if (!ir.ok) throw new Error('HTTP ' + ir.status);
          var iblob = await ir.blob();
          var rawExt = imgSrcs[j].split('.').pop().split('?')[0].toLowerCase();
          var iext  = ['jpg','jpeg','png','gif','webp'].includes(rawExt) ? rawExt : 'jpg';
          if (iext === 'jpeg') iext = 'jpg';
          var ifname = item.numId + '_p' + String(j + 1).padStart(2, '0') + '.' + iext;
          folder.file(ifname, iblob);
          imgFilenames.push(ifname);
          imgTotal++;
          chunkCount++;
        } catch (e) {
          console.warn('  img fail: ' + imgSrcs[j].slice(-50) + ' / ' + e.message);
          failTotal++;
        }
        await delay(200);
      }
    }

    excelRows.push({
      '번호'   : allItems.length - i,
      '제목'   : item.title,
      '작성자' : decodeAuthor(item.authorRaw),
      '등록일' : item.date,
      '파일수' : imgFilenames.length,
      '파일명' : imgFilenames.join(' | ')
    });

    if ((i+1) % 10 === 0 || i+1 === allItems.length) {
      var pct = Math.round((i+1)/allItems.length*100);
      console.log('  [' + (i+1) + '/' + allItems.length + '] ' + pct + '% | 파일 ' + imgTotal + '개');
    }

    // 30건마다 ZIP 분할 저장
    if (chunkCount >= CHUNK) {
      await saveZip(zip, '한마음교회_포토앨범_' + String(chunkIdx).padStart(2,'0') + '부.zip');
      chunkIdx++; zip = new JSZip(); folder = zip.folder('HMC_포토앨범'); chunkCount = 0;
    }

    await delay(DELAY);
  }

  // 나머지 ZIP 저장
  if (chunkCount > 0) {
    var finalName = chunkIdx === 1
      ? '한마음교회_포토앨범_전체.zip'
      : '한마음교회_포토앨범_' + String(chunkIdx).padStart(2,'0') + '부.zip';
    await saveZip(zip, finalName);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Excel 저장
  // ══════════════════════════════════════════════════════════════════════════════
  console.log('\n[4/4] Excel 저장...');
  var ws = XLSX.utils.json_to_sheet(excelRows);
  ws['!cols'] = [{ wch:6 }, { wch:50 }, { wch:20 }, { wch:12 }, { wch:6 }, { wch:80 }];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '포토앨범');
  XLSX.writeFile(wb, '한마음교회_포토앨범.xlsx');

  console.log('\n==============================');
  console.log('완료! 게시글: ' + allItems.length + '건');
  console.log('     이미지:  ' + imgTotal + '개');
  console.log('     실패:    ' + failTotal + '개');
  console.log('==============================');
})();
```
