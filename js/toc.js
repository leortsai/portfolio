/* 第 7 節 14、15：側邊目錄與閱讀進度條
   目錄依 .case-section[id] 的 H2 自動產生，桌機固定在左側留白、
   1400px 以下改成正文開頭的收合式 <details>。
   目前段落以 aria-current="true" 標示，兩份清單同步。
   進度條純裝飾，aria-hidden，不進無障礙樹。 */
(function () {
  'use strict';

  var content = document.querySelector('.case-content');
  var sections = content
    ? Array.prototype.slice.call(content.querySelectorAll('.case-section[id]'))
    : [];

  /* ---------- 15 閱讀進度條 ---------- */
  var track = document.createElement('div');
  track.className = 'read-progress';
  track.setAttribute('aria-hidden', 'true');
  track.innerHTML = '<div class="read-progress-bar"></div>';
  document.body.appendChild(track);
  var bar = track.firstElementChild;

  function progress() {
    var doc = document.documentElement;
    var max = (document.body.scrollHeight || doc.scrollHeight) - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = 'scaleX(' + p + ')';
  }

  /* ---------- 14 側邊目錄 ---------- */
  var links = [];           // 兩份清單的所有連結，用 data-i 對應段落
  var panel = null;
  var details = null;

  function makeList(items) {
    var ul = document.createElement('ul');
    ul.className = 'toc-list';
    items.forEach(function (s, i) {
      var h2 = s.querySelector('.case-section-title');
      var numEl = s.querySelector('.case-section-num');
      if (!h2) return;

      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + s.id;
      a.dataset.i = String(i);
      a.innerHTML =
        '<span class="toc-num">' + (numEl ? numEl.textContent.trim() : (i + 1)) + '</span>' +
        '<span class="toc-text"></span>';
      a.querySelector('.toc-text').textContent = h2.textContent.trim();
      li.appendChild(a);
      ul.appendChild(li);
      links.push(a);
    });
    return ul;
  }

  if (sections.length > 1) {
    /* 桌機：固定側邊 */
    panel = document.createElement('nav');
    panel.className = 'toc';
    panel.setAttribute('aria-label', '本頁目錄');
    var title = document.createElement('p');
    title.className = 'toc-title';
    title.textContent = '目錄';
    panel.appendChild(title);
    panel.appendChild(makeList(sections));
    document.body.appendChild(panel);

    /* 手機／平板：正文開頭的收合式目錄 */
    details = document.createElement('details');
    details.className = 'toc-mobile';
    var summary = document.createElement('summary');
    summary.textContent = '本頁目錄';
    details.appendChild(summary);
    details.appendChild(makeList(sections));
    content.insertBefore(details, content.firstChild);

    /* 點了收合式目錄裡的連結就把它收起來，不要蓋住要去的段落 */
    details.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.toc-link')) details.open = false;
    });
  }

  /* 目前段落：取最後一個已經捲過畫面上緣（含 nav 高度）的段落 */
  var activeIndex = -1;

  function setActive(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    links.forEach(function (a) {
      if (Number(a.dataset.i) === i) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  /* offsetTop 會受 offsetParent 影響，一律用 rect 換算文件座標 */
  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function spy() {
    if (!sections.length) return;
    var line = window.scrollY + 140;
    var found = -1;
    for (var i = 0; i < sections.length; i++) {
      if (docTop(sections[i]) <= line) found = i;
      else break;
    }
    setActive(found);

    /* 目錄只在正文範圍內出現，Hero 與頁尾時收起 */
    if (panel) {
      var last = sections[sections.length - 1];
      var inRange = window.scrollY + window.innerHeight * 0.4 > docTop(sections[0]) &&
                    window.scrollY < docTop(last) + last.offsetHeight;
      panel.classList.toggle('is-on', inRange);
    }
  }

  function update() { progress(); spy(); }

  /* 不包 requestAnimationFrame：背景分頁會把 rAF 節流到不執行。 */
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
})();
