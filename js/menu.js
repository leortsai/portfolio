/* 滿版錯落選單
   點 Work 之後，遮罩用 clip-path inset 由上往下揭開；
   巨型標題各自從 translateY(110%) 依序進場，每列錯開 80ms，底部資訊最後淡入。
   關閉時文字先倒序退出，再收起遮罩。 */
(function () {
  'use strict';

  var panel = document.querySelector('.menu-panel');
  var openBtn = document.querySelector('.menu-trigger');
  if (!panel || !openBtn) return;

  var closeBtn = panel.querySelector('.menu-close');
  var rows = Array.prototype.slice.call(panel.querySelectorAll('[data-menu-row]'));
  var STEP = 80;                       // 每列錯開
  var PANEL_MS = 500;                  // 遮罩揭開/收起
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var lastFocused = null;
  var prevOverflow = '';
  var closeTimer = null;

  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('a[href], button:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function setDelays(reverse) {
    rows.forEach(function (row, i) {
      var k = reverse ? (rows.length - 1 - i) : i;
      row.style.transitionDelay = reduce.matches ? '0ms' : (k * STEP) + 'ms';
    });
  }

  function open() {
    if (panel.classList.contains('is-open')) return;
    clearTimeout(closeTimer);
    lastFocused = document.activeElement;

    panel.hidden = false;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';      // 鎖住背景捲動
    if (window.lenis && window.lenis.stop) window.lenis.stop();

    setDelays(false);
    /* 強制一次 reflow，transition 才會從收起的狀態起跑 */
    void panel.offsetWidth;
    panel.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }

  function close(restoreFocus) {
    if (!panel.classList.contains('is-open')) return;
    setDelays(true);                               // 文字倒序退出
    panel.classList.remove('is-open');
    panel.classList.add('is-closing');
    openBtn.setAttribute('aria-expanded', 'false');

    var wait = reduce.matches ? 0 : (rows.length * STEP + PANEL_MS);
    closeTimer = setTimeout(function () {
      panel.hidden = true;
      panel.classList.remove('is-closing');
      document.body.style.overflow = prevOverflow;
      if (window.lenis && window.lenis.start) window.lenis.start();
    }, wait);

    if (restoreFocus !== false && lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  openBtn.addEventListener('click', function (e) { e.preventDefault(); open(); });
  closeBtn.addEventListener('click', function () { close(); });

  document.addEventListener('keydown', function (e) {
    if (panel.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    /* 焦點鎖在面板內 */
    var list = focusables();
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* 選了連結就收起面板。同一頁的錨點要自己捲，因為面板關閉前背景是鎖住的。 */
  panel.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var hash = href.indexOf('#');
    var samePage = hash === 0 ||
      (hash > 0 && href.slice(0, hash) === location.pathname.split('/').pop());

    if (samePage) {
      var target = document.getElementById(href.slice(hash + 1));
      if (target) {
        e.preventDefault();
        close(false);
        setTimeout(function () {
          var y = target.getBoundingClientRect().top + window.scrollY - 80;
          if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(y);
          else window.scrollTo(0, y);
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }, reduce.matches ? 0 : PANEL_MS);
        return;
      }
    }
    close(false);                                  // 跨頁：讓瀏覽器自己導過去
  });
})();
