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
