/* 回到頂端：捲過一個螢幕高之後出現 */
(function () {
  'use strict';

  var btn = document.querySelector('.to-top');
  if (!btn) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function update() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    btn.classList.toggle('is-on', window.scrollY > vh);
  }

  /* 不包 requestAnimationFrame：背景分頁會把 rAF 節流到不執行。
     這裡只讀 scrollY 與切一個 class，成本很低。 */
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  btn.addEventListener('click', function () {
    if (window.lenis && window.lenis.scrollTo) {
      window.lenis.scrollTo(0, { immediate: reduce.matches });
    } else {
      window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    /* 捲回頂端後把焦點交還給頁面開頭，鍵盤使用者才不會卡在按鈕上 */
    var main = document.getElementById('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  });
})();

/* 內嵌 demo 的焦點框
   iframe 進得了 Tab 順序，但焦點一旦進到跨網域的內層文件，
   外層的 :focus-within 與 iframe:focus 都不會成立，CSS 畫不出框。
   改用視窗 blur 時 document.activeElement 是不是這個 iframe 來判斷。 */
(function () {
  'use strict';
  var frame = document.querySelector('.case-embed iframe');
  if (!frame) return;
  var wrap = frame.closest('.case-embed');

  function on()  { wrap.classList.add('is-focus'); }
  function off() { wrap.classList.remove('is-focus'); }

  window.addEventListener('blur', function () {
    if (document.activeElement === frame) on();
  });
  window.addEventListener('focus', off);
  frame.addEventListener('focus', on);
  frame.addEventListener('blur', off);
  document.addEventListener('focusin', function (e) {
    if (e.target !== frame) off();
  });
})();
