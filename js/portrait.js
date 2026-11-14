/* About 人像：ASCII → 照片
   兩層疊放，往下捲時 ASCII 淡出、照片從模糊 8px 收到 0。
   用 CSS 變數 --fade 驅動（1 = 全 ASCII，0 = 全照片），
   JS 只負責算進度，動畫交給 CSS，開啟「減少動態效果」時整段不跑。 */
(function () {
  'use strict';

  var wrap = document.querySelector('.about-portrait');
  if (!wrap) return;

  var ascii = wrap.querySelector('#ascii-about');
  var photo = wrap.querySelector('.about-photo');
  if (!photo) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setFade(v) {
    v = Math.max(0, Math.min(1, v));
    if (ascii) ascii.style.setProperty('--fade', v);
    photo.style.setProperty('--fade', v);
  }

  function update() {
    if (reduce.matches) { setFade(0); return; }
    var r = wrap.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (!vh) return;                 /* 還沒量到視窗高度，算出來會是 NaN */
    /* 人像中心從畫面下緣 75% 走到 35% 的這段距離內完成轉換 */
    var centre = r.top + r.height / 2;
    var start = vh * 0.75;
    var end = vh * 0.35;
    setFade((centre - end) / (start - end));
  }

  /* 直接算，不包 requestAnimationFrame：
     背景分頁會把 rAF 節流到不執行，人像就會卡在全 ASCII。
     update() 只做一次 getBoundingClientRect，成本很低。 */
  function onScroll() { update(); }

  setFade(1);
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (reduce.addEventListener) reduce.addEventListener('change', update);
})();
